import 'dotenv/config';
import IORedis from 'ioredis';

export function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
  });
}
