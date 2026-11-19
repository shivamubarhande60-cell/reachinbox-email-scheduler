import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

export const redisConnection = createRedisConnection();

export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
});

export const emailIndexQueue = new Queue('email-index-queue', {
  connection: redisConnection,
});

export interface EmailJobLeadInput {
  id: number;
  scheduledAt: Date | null;
}

/**
 * Enqueues delayed email delivery jobs in BullMQ with deterministic job IDs.
 */
export async function enqueueEmailJobs(leads: EmailJobLeadInput[]): Promise<void> {
  if (!leads.length) return;

  await emailQueue.addBulk(
    leads.map((lead) => ({
      name: 'send-email',
      data: { leadId: lead.id },
      opts: {
        jobId: `email-${lead.id}`,
        delay: Math.max(0, (lead.scheduledAt?.getTime() || Date.now()) - Date.now()),
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    })),
  );
}

/**
 * Enqueues Elasticsearch indexing jobs for lead records.
 */
export async function enqueueIndexJobs(leadIds: number[], reason = 'scheduled'): Promise<void> {
  if (!leadIds.length) return;

  await emailIndexQueue.addBulk(
    leadIds.map((leadId) => ({
      name: 'index-email',
      data: { leadId },
      opts: {
        jobId: `index-${leadId}-${reason}`,
        attempts: 10,
        backoff: { type: 'exponential' as const, delay: 1000 },
        removeOnComplete: false,
        removeOnFail: true,
      },
    })),
  );
}
