import IORedis from 'ioredis';
import { env } from '../config/env';

/**
 * Creates a BullMQ-compatible IORedis connection from centralized environment config.
 */
export function createRedisConnection(): IORedis {
  if (env.redis.url) {
    return new IORedis(env.redis.url, { maxRetriesPerRequest: null, family: 0 });
  }

  return new IORedis({
    host: env.redis.host,
    port: env.redis.port,
    maxRetriesPerRequest: null,
    family: 0,
  });
}
