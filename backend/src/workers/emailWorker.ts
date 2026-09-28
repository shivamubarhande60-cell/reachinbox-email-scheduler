import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { DelayedError, Job, Worker } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { emailIndexQueue } from '../queues/emailQueue';
import { indexEmailDoc } from '../../services/elasticsearch';
import prisma from '../../services/database';
import { createRedisConnection } from '../../services/redisConnection';
import { reserveHourlyCapacity } from '../../services/rateLimit';
import { getSender, getTransporter, type Sender } from '../../services/senders';
import { decryptToken } from '../../services/tokenEncryption';

const redis = createRedisConnection();

const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);
const globalHourlyLimit = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || process.env.MAX_EMAILS_PER_HOUR || 200);
const minimumDelayMs = Number(process.env.EMAIL_DELAY_MS || 2000);
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

async function delayJob(job: Job<EmailJob>, until: number) {
  await job.moveToDelayed(until, job.token);
  throw new DelayedError();
}

async function queueEmailIndex(leadId: number, reason: string) {
  await emailIndexQueue.add(
    'index-email',
    { leadId },
    {
      jobId: `index-${leadId}-${reason}`,
      attempts: 10,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: false,
      removeOnFail: true,
    },
  );
}

async function notifySlack(userId: number | null, senderId: string, limit: number, hour: number) {
  if (!userId) return;

  let notificationKey: string | undefined;
  let notificationReserved = false;
  try {
    const connection = await prisma.slackConnection.findUnique({ where: { userId } });
    if (!connection) return;

    notificationKey = `rate-notification:${senderId}:${userId}:${hour}`;
    const firstNotification = await redis.set(notificationKey, '1', 'EX', 7200, 'NX');
    if (!firstNotification) return;
    notificationReserved = true;

    const token = decryptToken(connection.encryptedToken, connection.tokenIv, connection.tokenTag);
    const opened = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ users: connection.slackUserId }),
    });
    const openResult = await opened.json() as {
      ok: boolean;
      error?: string;
      channel?: { id?: string };
    };
    if (!opened.ok || !openResult.ok || !openResult.channel?.id) {
      throw new Error(`Slack could not open a direct message: ${openResult.error || opened.statusText}`);
    }

    const sent = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        channel: openResult.channel.id,
        text: `The hourly email limit of ${limit} was reached for sender "${senderId}". Remaining emails are queued for the next UTC hour.`,
      }),
    });
    const sendResult = await sent.json() as { ok: boolean; error?: string };
    if (!sent.ok || !sendResult.ok) {
      throw new Error(`Slack could not send the rate-limit message: ${sendResult.error || sent.statusText}`);
    }
    notificationReserved = false;
    console.log(`Slack rate-limit notification sent for sender ${senderId}.`);
  } catch (error) {
    if (notificationReserved && notificationKey) {
      try {
        await redis.del(notificationKey);
      } catch (releaseError) {
        console.error('Could not release the Slack notification reservation:', releaseError);
      }
    }
    console.error('Slack rate-limit notification failed:', error);
  }
}

async function indexLead(leadId: number) {
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

async function waitForSendGap(lead: SendingLead, sender: Sender, job: Job<EmailJob>) {
  const gap = Math.max(minimumDelayMs, sender.minimumDelayMs, lead.campaign.delayMs);
  const lastSend = Number(await redis.get(`email-last-send:${lead.senderId}`) || 0);
  const nextSend = lastSend + gap;
  if (lastSend && Date.now() < nextSend) {
    await prisma.lead.update({ where: { id: lead.id }, data: { scheduledAt: new Date(nextSend) } });
    await delayJob(job, nextSend);
  }
}

async function checkHourlyLimit(
  lead: SendingLead,
  sender: Sender,
  job: Job<EmailJob>,
) {
  const hour = Math.floor(Date.now() / 3600000);
  const campaignLimit = Math.min(lead.campaign.hourlyLimit || sender.maxEmailsPerHour, sender.maxEmailsPerHour);
  const reservation = await reserveHourlyCapacity(
    redis,
    lead.senderId,
    lead.campaignId,
    hour,
    sender.maxEmailsPerHour,
    campaignLimit,
  );
  if (reservation === 1 || reservation === 3) {
    if (reservation === 3) await notifySlack(lead.campaign.userId, lead.senderId, sender.maxEmailsPerHour, hour);
    return;
  }

  const nextHour = (hour + 1) * 3600000;
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'THROTTLED_DELAYED', scheduledAt: new Date(nextHour) },
  });
  await delayJob(job, nextHour);
}

async function sendEmail(
  lead: SendingLead,
  sender: Sender,
) {
  try {
    await getTransporter(sender).sendMail({
      from: sender.from,
      to: lead.email,
      subject: lead.campaign.subject,
      text: lead.campaign.body,
    });
  } catch (error) {
    const responseCode = typeof error === 'object' && error !== null && 'responseCode' in error
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
    await queueEmailIndex(lead.id, 'failed');
    return;
  }

  const sentAt = new Date();
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'SENT', sentAt, scheduledAt: sentAt, errorMessage: null },
  });
  await queueEmailIndex(lead.id, 'sent');
  console.log(`Email sent to ${lead.email} using sender ${sender.id}.`);
}

async function processEmail(job: Job<EmailJob>) {
  const lead = await prisma.lead.findUnique({
    where: { id: job.data.leadId },
    include: { campaign: true },
  });
  if (!lead) throw new Error(`Cannot send missing lead ${job.data.leadId}.`);
  if (lead.status === 'SENT' || lead.status === 'FAILED') return;
  if (lead.status === 'SENDING') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Delivery stopped unexpectedly; it was not retried to avoid a possible duplicate.',
      },
    });
    await queueEmailIndex(lead.id, 'failed');
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

export async function closeWorkers() {
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
    if (updated.count) await queueEmailIndex(job.data.leadId, 'failed');
  }
});

emailIndexWorker.on('failed', (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    console.error(`Email ${job.data.leadId} could not be indexed after retries:`, error);
  }
});
