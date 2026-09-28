import 'dotenv/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
});

export const emailIndexQueue = new Queue('email-index-queue', {
  connection: redisConnection,
});
