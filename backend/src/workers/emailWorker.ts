import { randomUUID } from 'node:crypto';
import { DelayedError, Job, Worker } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { indexEmailDoc } from '../lib/elasticsearch';
import prisma from '../lib/prisma';
import { createRedisConnection } from '../lib/redis';
import { enqueueIndexJobs } from '../queues/emailQueue';
import { HttpDeliveryError, sendViaHttpProvider } from '../services/emailDelivery';
import { shouldSimulateEmailDelivery } from '../services/emailDeliveryMode';
import { reserveHourlyCapacity } from '../services/rateLimitService';
import { getSender, getTransporter, type Sender } from '../services/senderService';
import { notifySlackRateLimit } from '../services/slackService';

const redis = createRedisConnection();

const concurrency = env.rateLimit.workerConcurrency;
const minimumDelayMs = env.rateLimit.minimumDelayMs;

const releaseSenderLockScript = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

interface EmailJob {
  leadId: number;
}

type SendingLead = Prisma.LeadGetPayload<{ include: { campaign: true } }>;

async function delayJob(job: Job<EmailJob>, until: number): Promise<never> {
  await job.moveToDelayed(until, job.token);
  throw new DelayedError();
}

async function indexLead(leadId: number): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { campaign: true },
  });
  if (!lead) throw new Error(`Cannot index missing lead ${leadId}.`);

  await indexEmailDoc({
    leadId: lead.id,
    userId: lead.campaign.userId,
    campaignName: lead.campaign.name,
    senderId: lead.senderId,
    email: lead.email,
    subject: lead.campaign.subject,
    body: lead.campaign.body,
    status: lead.status,
    scheduledAt: lead.scheduledAt,
    sentAt: lead.sentAt,
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { indexedAt: new Date() },
  });
}

export const emailIndexWorker = new Worker<{ leadId: number }>(
  'email-index-queue',
  async (job) => indexLead(job.data.leadId),
  {
    connection: redis.duplicate(),
    concurrency: Math.max(1, Math.min(concurrency, 10)),
  },
);

async function waitForSendGap(lead: SendingLead, sender: Sender, job: Job<EmailJob>): Promise<void> {
  const gap = Math.max(minimumDelayMs, sender.minimumDelayMs, lead.campaign.delayMs);
  const lastSend = Number((await redis.get(`email-last-send:${lead.senderId}`)) || 0);
  const nextSend = lastSend + gap;
  if (lastSend && Date.now() < nextSend) {
    await prisma.lead.update({ where: { id: lead.id }, data: { scheduledAt: new Date(nextSend) } });
    await delayJob(job, nextSend);
  }
}

async function checkHourlyLimit(lead: SendingLead, sender: Sender, job: Job<EmailJob>): Promise<void> {
  const hour = Math.floor(Date.now() / 3600000);
  const campaignLimit = Math.min(
    lead.campaign.hourlyLimit || sender.maxEmailsPerHour,
    sender.maxEmailsPerHour,
  );
  const reservation = await reserveHourlyCapacity(
    redis,
    lead.senderId,
    lead.campaignId,
    hour,
    sender.maxEmailsPerHour,
    campaignLimit,
  );
  if (reservation === 1 || reservation === 3) {
    if (reservation === 3) {
      await notifySlackRateLimit(redis, lead.campaign.userId, lead.senderId, sender.maxEmailsPerHour, hour);
    }
    return;
  }

  const nextHour = (hour + 1) * 3600000;
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'THROTTLED_DELAYED', scheduledAt: new Date(nextHour) },
  });
  await delayJob(job, nextHour);
}

async function sendEmail(lead: SendingLead, sender: Sender): Promise<void> {
  if (shouldSimulateEmailDelivery(sender.simulated)) {
    const simulatedAt = new Date();
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'SIMULATED',
        sentAt: simulatedAt,
        scheduledAt: simulatedAt,
        errorMessage: 'Demo mode: no email was sent.',
      },
    });
    await enqueueIndexJobs([lead.id], 'simulated');
    console.log(`Email delivery simulated for lead ${lead.id} using sender ${sender.id}.`);
    return;
  }

  if (sender.transport !== 'smtp') {
    try {
      await sendViaHttpProvider(
        {
          transport: sender.transport,
          name: sender.name,
          from: sender.from,
          pass: sender.pass,
        },
        {
          to: lead.email,
          subject: lead.campaign.subject,
          text: lead.campaign.body,
        },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (error instanceof HttpDeliveryError && error.retryable) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'PENDING', errorMessage: detail },
        });
        throw error;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'FAILED', errorMessage: detail },
      });
      await enqueueIndexJobs([lead.id], 'failed');
      return;
    }
  } else {
    try {
      await getTransporter(sender).sendMail({
        from: sender.from,
        to: lead.email,
        subject: lead.campaign.subject,
        text: lead.campaign.body,
      });
    } catch (error) {
      const responseCode =
        typeof error === 'object' && error !== null && 'responseCode' in error
          ? error.responseCode
          : undefined;
      if (typeof responseCode === 'number' && responseCode >= 400 && responseCode < 500) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'PENDING', errorMessage: String(error) },
        });
        throw error;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'FAILED',
          errorMessage: `SMTP delivery outcome is uncertain; not retried to avoid a possible duplicate. ${String(error)}`,
        },
      });
      await enqueueIndexJobs([lead.id], 'failed');
      return;
    }
  }

  const sentAt = new Date();
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'SENT', sentAt, scheduledAt: sentAt, errorMessage: null },
  });
  await enqueueIndexJobs([lead.id], 'sent');
  console.log(`Email sent to ${lead.email} using sender ${sender.id}.`);
}

async function processEmail(job: Job<EmailJob>): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: job.data.leadId },
    include: { campaign: true },
  });
  if (!lead) throw new Error(`Cannot send missing lead ${job.data.leadId}.`);
  if (lead.status === 'SENT' || lead.status === 'SIMULATED' || lead.status === 'FAILED') return;
  if (lead.status === 'SENDING') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Delivery stopped unexpectedly; it was not retried to avoid a possible duplicate.',
      },
    });
    await enqueueIndexJobs([lead.id], 'failed');
    return;
  }

  const sender = await getSender(lead.senderId, lead.campaign.userId || 0);
  if (!sender) throw new Error(`SMTP sender "${lead.senderId}" is not configured.`);

  const lockKey = `email-sender-lock:${lead.senderId}`;
  const lockValue = `${job.id}:${randomUUID()}`;
  if (!(await redis.set(lockKey, lockValue, 'PX', 90000, 'NX'))) {
    await delayJob(job, Date.now() + 500);
  }

  try {
    await waitForSendGap(lead, sender, job);
    await checkHourlyLimit(lead, sender, job);
    await redis.set(`email-last-send:${lead.senderId}`, String(Date.now()), 'EX', 172800);
    const claimed = await prisma.lead.updateMany({
      where: { id: lead.id, status: { in: ['PENDING', 'THROTTLED_DELAYED'] } },
      data: { status: 'SENDING', errorMessage: null },
    });
    if (claimed.count) await sendEmail(lead, sender);
  } finally {
    await redis.eval(releaseSenderLockScript, 1, lockKey, lockValue);
  }
}

export const emailWorker = new Worker<EmailJob>('email-queue', processEmail, {
  connection: redis.duplicate(),
  concurrency,
});

/**
 * Gracefully drains and closes both BullMQ workers and their Redis connection.
 */
export async function closeWorkers(): Promise<void> {
  await Promise.all([emailWorker.close(), emailIndexWorker.close(), redis.quit()]);
}

emailWorker.on('failed', async (job, error) => {
  if (!job) return;
  console.error(`Email job ${job.id} failed:`, error);
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    const updated = await prisma.lead.updateMany({
      where: { id: job.data.leadId, status: 'PENDING' },
      data: { status: 'FAILED', errorMessage: error.message },
    });
    if (updated.count) await enqueueIndexJobs([job.data.leadId], 'failed');
  }
});

emailIndexWorker.on('failed', (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    console.error(`Email ${job.data.leadId} could not be indexed after retries:`, error);
  }
});
