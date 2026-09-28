require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const Redis = require('ioredis');
const { reserveHourlyCapacity } = require('../dist/services/rateLimit.js');

test('Redis grants only the configured sender capacity under concurrent reservations', async (t) => {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
  });
  const senderId = `test-${randomUUID()}`;
  const campaignId = Math.floor(Math.random() * 1000000000);
  const hour = Math.floor(Date.now() / 3600000);
  const senderKey = `email-rate:${senderId}:${hour}`;
  const campaignKey = `campaign-email-rate:${campaignId}:${hour}`;
  t.after(async () => {
    await redis.del(senderKey, campaignKey);
    await redis.quit();
  });

  await redis.connect();
  const results = await Promise.all(Array.from({ length: 25 }, () =>
    reserveHourlyCapacity(redis, senderId, campaignId, hour, 5, 25),
  ));
  assert.equal(results.filter((result) => result === 1 || result === 3).length, 5);
  assert.equal(results.filter((result) => result === 3).length, 1);
  assert.equal(results.filter((result) => result === 1).length, 4);
  assert.equal(results.filter((result) => result === 0).length, 20);
});

test('Redis separately enforces a lower campaign limit', async (t) => {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
  });
  const senderId = `test-${randomUUID()}`;
  const campaignId = Math.floor(Math.random() * 1000000000);
  const hour = Math.floor(Date.now() / 3600000);
  t.after(async () => {
    await redis.del(`email-rate:${senderId}:${hour}`, `campaign-email-rate:${campaignId}:${hour}`);
    await redis.quit();
  });

  await redis.connect();
  assert.equal(await reserveHourlyCapacity(redis, senderId, campaignId, hour, 10, 2), 1);
  assert.equal(await reserveHourlyCapacity(redis, senderId, campaignId, hour, 10, 2), 1);
  assert.equal(await reserveHourlyCapacity(redis, senderId, campaignId, hour, 10, 2), 2);
});
