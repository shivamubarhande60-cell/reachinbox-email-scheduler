require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
};

test('BullMQ retains 1,000 delayed jobs after the queue client reconnects', async (t) => {
  const queueName = `persistence-test-${randomUUID()}`;
  const queue = new Queue(queueName, { connection });
  let cleanupQueue = queue;
  t.after(async () => {
    await cleanupQueue.obliterate({ force: true });
    await cleanupQueue.close();
  });

  await queue.addBulk(Array.from({ length: 1000 }, (_, index) => ({
    name: 'send-email',
    data: { leadId: index + 1 },
    opts: {
      jobId: `email-${index + 1}`,
      delay: 60 * 60 * 1000,
      removeOnComplete: false,
    },
  })));
  await queue.close();

  const reconnectedQueue = new Queue(queueName, { connection });
  cleanupQueue = reconnectedQueue;
  const counts = await reconnectedQueue.getJobCounts('delayed');
  assert.equal(counts.delayed, 1000);
});
