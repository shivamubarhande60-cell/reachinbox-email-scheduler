import { Prisma } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  ServiceUnavailableError,
} from '../errors/AppError';
import prisma from '../lib/prisma';
import { enqueueEmailJobs, enqueueIndexJobs } from '../queues/emailQueue';
import { validateScheduleInput } from './scheduleValidation';
import { getSender } from './senderService';

export interface ScheduleCampaignParams {
  userId: number;
  body: unknown;
  idempotencyKeyHeader?: string;
}

/**
 * Validates, persists (with idempotency), and schedules a campaign's email jobs in BullMQ.
 */
export async function scheduleCampaign({ userId, body, idempotencyKeyHeader }: ScheduleCampaignParams) {
  const input =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const { campaignIdentifier, name, senderId } = input;

  if (typeof senderId !== 'string' || !senderId.trim()) {
    throw new ServiceUnavailableError('Configure at least one SMTP sender before scheduling.');
  }

  const sender = await getSender(senderId, userId);
  if (!sender) {
    throw new BadRequestError('Choose a configured email sender.');
  }

  const account = await prisma.user.findUnique({ where: { id: userId }, select: { googleId: true } });
  if (
    account?.googleId === 'local-demo-user' &&
    !sender.simulated &&
    sender.host.toLowerCase() !== 'smtp.ethereal.email'
  ) {
    throw new ForbiddenError('Local preview can only send through Ethereal SMTP.');
  }

  const validated = validateScheduleInput(body, {
    minimumDelayMs: sender.minimumDelayMs,
    maximumHourlyLimit: sender.maxEmailsPerHour,
  });
  if (!validated.value) {
    throw new BadRequestError(validated.error);
  }
  const { subject, body: emailBody, emails, startAt, delayMs, hourlyLimit } = validated.value;

  const rawKey = idempotencyKeyHeader || (typeof input.idempotencyKey === 'string' ? input.idempotencyKey : '');
  const idempotencyKey = rawKey.trim();
  if (!idempotencyKey) {
    throw new BadRequestError('Send a unique Idempotency-Key header with the schedule request.');
  }
  if (idempotencyKey.length > 191) {
    throw new BadRequestError('Idempotency key must be 191 characters or fewer.');
  }

  let campaign = await prisma.campaign.findUnique({
    where: { idempotencyKey },
    include: { leads: { select: { id: true, scheduledAt: true } } },
  });
  if (campaign && campaign.userId !== userId) {
    throw new ConflictError('Idempotency key is already in use.');
  }

  if (!campaign) {
    const resolvedName =
      (typeof campaignIdentifier === 'string' && campaignIdentifier.trim()) ||
      (typeof name === 'string' && name.trim()) ||
      `Campaign ${new Date().toLocaleDateString()}`;

    try {
      campaign = await prisma.campaign.create({
        data: {
          name: resolvedName,
          subject: subject.trim(),
          body: emailBody.trim(),
          senderId,
          userId,
          startAt,
          delayMs,
          hourlyLimit,
          idempotencyKey,
          leads: {
            create: emails.map((email) => ({
              email,
              senderId,
              status: 'PENDING',
              scheduledAt: startAt,
            })),
          },
        },
        include: { leads: { select: { id: true, scheduledAt: true } } },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      campaign = await prisma.campaign.findUnique({
        where: { idempotencyKey },
        include: { leads: { select: { id: true, scheduledAt: true } } },
      });
      if (!campaign || campaign.userId !== userId) {
        throw new ConflictError('Idempotency key is already in use.');
      }
    }
  }

  await enqueueEmailJobs(campaign.leads);
  await enqueueIndexJobs(campaign.leads.map((lead) => lead.id));

  return {
    campaignId: campaign.id,
    count: campaign.leads.length,
  };
}

/**
 * Lists all campaigns and their leads for a user, ordered newest first.
 */
export async function listUserCampaigns(userId: number) {
  return prisma.campaign.findMany({
    where: { userId },
    include: { leads: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Re-enqueues pending leads and unindexed records on server startup.
 */
export async function recoverPendingJobs(): Promise<void> {
  const pendingLeads = await prisma.lead.findMany({
    where: { status: { in: ['PENDING', 'THROTTLED_DELAYED'] } },
    select: { id: true, scheduledAt: true },
  });
  await enqueueEmailJobs(pendingLeads);

  const unindexedLeads = await prisma.lead.findMany({
    where: { indexedAt: null },
    select: { id: true },
  });
  await enqueueIndexJobs(
    unindexedLeads.map((lead) => lead.id),
    `recovery-${Date.now()}`,
  );
}
