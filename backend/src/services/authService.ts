import { randomBytes } from 'node:crypto';
import { env, requireConfig } from '../config/env';
import { BadGatewayError, BadRequestError, ServiceUnavailableError, UnauthorizedError } from '../errors/AppError';
import prisma from '../lib/prisma';
import { redisConnection } from '../queues/emailQueue';
import { isEmailSimulationEnabled } from './emailDeliveryMode';

function oauthStateKey(provider: string, state: string): string {
  return `oauth-state:${provider}:${state}`;
}

export function getGoogleCallbackUrl(): string {
  return env.google.callbackUrl || new URL('/auth/google/callback', env.frontendUrl).toString();
}

/**
 * Generates a Google OAuth2 authorization URL and stores a short-lived CSRF state token in Redis.
 */
export async function createGoogleAuthUrl(): Promise<string> {
  let clientId: string;
  try {
    clientId = requireConfig(env.google.clientId, 'GOOGLE_CLIENT_ID');
  } catch (error) {
    throw new ServiceUnavailableError(error instanceof Error ? error.message : 'Google OAuth not configured.');
  }

  const state = randomBytes(32).toString('hex');
  await redisConnection.set(oauthStateKey('google', state), '1', 'EX', 600);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();

  return url.toString();
}

/**
 * Exchanges a Google OAuth authorization code for a verified user record.
 */
export async function authenticateGoogleCallback(code: string, state: string) {
  const stateKey = oauthStateKey('google', state);
  if (!(await redisConnection.getdel(stateKey))) {
    throw new BadRequestError('Google sign-in expired. Please try again.');
  }

  const clientId = requireConfig(env.google.clientId, 'GOOGLE_CLIENT_ID');
  const clientSecret = requireConfig(env.google.clientSecret, 'GOOGLE_CLIENT_SECRET');
  const redirectUri = getGoogleCallbackUrl();

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new BadGatewayError(`Google token exchange failed: ${tokenData.error || tokenResponse.statusText}`);
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = (await profileResponse.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
    verified_email?: boolean;
  };
  if (!profileResponse.ok || !profile.id || !profile.email || !profile.name || !profile.verified_email) {
    throw new BadGatewayError('Google did not return a verified email profile.');
  }

  return prisma.user.upsert({
    where: { googleId: profile.id },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
    update: {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
  });
}

/**
 * Upserts and returns the local-only demo user.
 */
export async function upsertLocalDemoUser() {
  return prisma.user.upsert({
    where: { googleId: 'local-demo-user' },
    create: {
      googleId: 'local-demo-user',
      email: 'preview@localhost.invalid',
      name: 'Local Preview',
    },
    update: {},
  });
}

/**
 * Fetches the authenticated user's profile and workspace capabilities.
 */
export async function getCurrentUserProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      picture: true,
      googleId: true,
      slackConnection: { select: { id: true } },
    },
  });
  if (!user) {
    throw new UnauthorizedError('Session has expired. Please sign in again.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    isDemo: user.googleId === 'local-demo-user',
    simulatedDelivery: isEmailSimulationEnabled(),
    slackConnected: Boolean(user.slackConnection),
    slackConfigured: Boolean(env.slack.clientId && env.slack.clientSecret),
  };
}
