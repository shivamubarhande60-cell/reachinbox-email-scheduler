import 'dotenv/config';
import { Queue } from 'bullmq';
import { createRedisConnection } from '../../services/redisConnection';

export const redisConnection = createRedisConnection();

export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
});

export const emailIndexQueue = new Queue('email-index-queue', {
  connection: redisConnection,
});
