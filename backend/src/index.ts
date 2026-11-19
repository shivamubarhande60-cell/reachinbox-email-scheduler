import { createApp } from './app';
import { env, validateStartupConfig } from './config/env';
import { getErrorMessage } from './errors/AppError';
import { esClient, initElasticsearch } from './lib/elasticsearch';
import prisma from './lib/prisma';
import { emailIndexQueue, emailQueue, redisConnection } from './queues/emailQueue';
import { recoverPendingJobs } from './services/campaignService';
import { senders } from './services/senderService';
import { closeWorkers } from './workers/emailWorker';

const app = createApp();
let httpServer: ReturnType<typeof app.listen> | undefined;
let shuttingDown = false;

async function start(): Promise<void> {
  validateStartupConfig();

  await prisma.$connect();
  await redisConnection.ping();

  try {
    await initElasticsearch();
  } catch (error) {
    console.warn(
      'Elasticsearch is unavailable; search will use the MySQL fallback until it recovers.',
      getErrorMessage(error),
    );
  }

  await recoverPendingJobs();

  httpServer = app.listen(env.port, () => {
    console.log(`API and email worker listening on http://localhost:${env.port}`);
    console.log(`BullMQ dashboard: http://localhost:${env.port}/admin/queues`);
    console.log(`Configured SMTP senders: ${senders.length}`);
  });
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Stopping the API and draining email workers...');

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await Promise.all([
      closeWorkers(),
      emailQueue.close(),
      emailIndexQueue.close(),
      esClient.close(),
    ]);
    await redisConnection.quit();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

start().catch(async (error) => {
  console.error('Could not start ReachInbox:', error);
  await shutdown();
  process.exitCode = 1;
});
