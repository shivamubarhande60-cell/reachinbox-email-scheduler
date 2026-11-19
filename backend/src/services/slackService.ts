import { randomBytes } from 'node:crypto';
import type IORedis from 'ioredis';
import { env, requireConfig } from '../config/env';
import { BadGatewayError, BadRequestError, ServiceUnavailableError } from '../errors/AppError';
import { decryptToken, encryptToken } from '../lib/crypto';
import prisma from '../lib/prisma';
import { redisConnection } from '../queues/emailQueue';

function oauthStateKey(state: string): string {
  return `oauth-state:slack:${state}`;
}

export function getSlackCallbackUrl(): string {
  return env.slack.callbackUrl || new URL('/auth/slack/callback', env.frontendUrl).toString();
}

/**
 * Generates a Slack OAuth2 authorization URL and persists state in Redis.
 */
export async function createSlackAuthUrl(userId: number): Promise<string> {
  let clientId: string;
  try {
    clientId = requireConfig(env.slack.clientId, 'SLACK_CLIENT_ID');
  } catch (error) {
    throw new ServiceUnavailableError(error instanceof Error ? error.message : 'Slack OAuth not configured.');
  }

  const state = randomBytes(32).toString('hex');
  await redisConnection.set(oauthStateKey(state), String(userId), 'EX', 600);

  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getSlackCallbackUrl(),
    scope: 'chat:write,im:write',
    state,
  }).toString();

  return url.toString();
}

/**
 * Completes the Slack OAuth callback, encrypts the token, and saves the connection.
 */
export async function connectSlackFromCallback(code: string, state: string): Promise<void> {
  const userId = Number(await redisConnection.getdel(oauthStateKey(state)));
  if (!Number.isInteger(userId) || userId < 1) {
    throw new BadRequestError('Slack connection expired. Please try again.');
  }

  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireConfig(env.slack.clientId, 'SLACK_CLIENT_ID'),
      client_secret: requireConfig(env.slack.clientSecret, 'SLACK_CLIENT_SECRET'),
      redirect_uri: getSlackCallbackUrl(),
    }),
  });
  const tokenData = (await tokenResponse.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    authed_user?: { id?: string; access_token?: string };
  };
  if (!tokenResponse.ok || !tokenData.ok || !tokenData.access_token || !tokenData.authed_user?.id) {
    throw new BadGatewayError(`Slack token exchange failed: ${tokenData.error || tokenResponse.statusText}`);
  }

  const storedToken = tokenData.authed_user.access_token || tokenData.access_token;
  const encryptedToken = encryptToken(storedToken);
  await prisma.slackConnection.upsert({
    where: { userId },
    create: {
      userId,
      slackUserId: tokenData.authed_user.id,
      ...encryptedToken,
    },
    update: {
      slackUserId: tokenData.authed_user.id,
      ...encryptedToken,
    },
  });
}

export async function isSlackConnected(userId: number): Promise<boolean> {
  const connection = await prisma.slackConnection.findUnique({ where: { userId }, select: { id: true } });
  return Boolean(connection);
}

export async function disconnectSlack(userId: number): Promise<void> {
  await prisma.slackConnection.deleteMany({ where: { userId } });
}

/**
 * Sends a one-per-hour Slack DM when a sender reaches its hourly rate limit.
 */
export async function notifySlackRateLimit(
  redis: IORedis,
  userId: number | null,
  senderId: string,
  limit: number,
  hour: number,
): Promise<void> {
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
    const openResult = (await opened.json()) as {
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
    const sendResult = (await sent.json()) as { ok: boolean; error?: string };
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
