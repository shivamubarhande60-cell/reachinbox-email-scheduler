import { randomBytes } from 'node:crypto';
import { env, requireConfig } from '../config/env';
import {
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../errors/AppError';
import { hashPassword, verifyPassword } from '../lib/crypto';
import prisma from '../lib/prisma';
import { redisConnection } from '../queues/emailQueue';
import { isEmailSimulationEnabled } from './emailDeliveryMode';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function oauthStateKey(provider: string, state: string): string {
  return `oauth-state:${provider}:${state}`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
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
    throw new ServiceUnavailableError(
      error instanceof Error ? error.message : 'Google OAuth not configured.',
    );
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
 * Exchanges a Google OAuth authorization code for a verified user record, linking existing emails cleanly.
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
    throw new BadGatewayError(
      `Google token exchange failed: ${tokenData.error || tokenResponse.statusText}`,
    );
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
  if (
    !profileResponse.ok ||
    !profile.id ||
    !profile.email ||
    !profile.name ||
    !profile.verified_email
  ) {
    throw new BadGatewayError('Google did not return a verified email profile.');
  }

  const normalizedEmail = profile.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.id }, { email: normalizedEmail }],
    },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: profile.id,
        email: normalizedEmail,
        name: profile.name,
        picture: profile.picture ?? existing.picture,
      },
    });
  }

  return prisma.user.create({
    data: {
      googleId: profile.id,
      email: normalizedEmail,
      name: profile.name,
      picture: profile.picture,
    },
  });
}

/**
 * Registers a new workspace account using email and password.
 */
export async function registerWithEmailPassword(input: unknown) {
  const data =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!name || name.length > 120) {
    throw new BadRequestError('Provide your full name (1 to 120 characters).');
  }
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new BadRequestError('Provide a valid email address.');
  }
  if (password.length < 8 || password.length > 128) {
    throw new BadRequestError('Password must be between 8 and 128 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });
}

/**
 * Authenticates an existing account using email and password.
 */
export async function loginWithEmailPassword(input: unknown) {
  const data =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!email || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  return user;
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
 * Upserts the hosted live demo user and seeds an initial sample campaign if empty.
 */
export async function upsertHostedDemoUser() {
  const user = await prisma.user.upsert({
    where: { googleId: 'hosted-demo-user' },
    create: {
      googleId: 'hosted-demo-user',
      email: 'demo@reachinbox.app',
      name: 'Demo Workspace',
    },
    update: {},
  });

  const existingCampaigns = await prisma.campaign.count({ where: { userId: user.id } });
  if (existingCampaigns === 0) {
    const now = Date.now();
    await prisma.campaign.create({
      data: {
        name: 'Q4 Product Changelog',
        subject: 'New rate-limiting controls & delivery diagnostics',
        body: 'Hi there,\n\nWe just shipped distributed sender locks, hourly UTC caps, and a live delivery inspector across ReachInbox.\n\nSchedule a test campaign from the Compose button to watch BullMQ pacing in real time.\n\nBest,\nThe ReachInbox Team',
        status: 'SCHEDULED',
        senderId: 'demo-sender',
        userId: user.id,
        startAt: new Date(now - 600_000),
        delayMs: 2000,
        hourlyLimit: 200,
        leads: {
          create: [
            {
              email: 'maya.chen@acme.example',
              senderId: 'demo-sender',
              status: 'SIMULATED',
              scheduledAt: new Date(now - 540_000),
              sentAt: new Date(now - 538_000),
              errorMessage: 'Demo mode: no email was sent.',
            },
            {
              email: 'devon.patel@northstar.example',
              senderId: 'demo-sender',
              status: 'SIMULATED',
              scheduledAt: new Date(now - 536_000),
              sentAt: new Date(now - 534_000),
              errorMessage: 'Demo mode: no email was sent.',
            },
            {
              email: 'elena@kestrel.example',
              senderId: 'demo-sender',
              status: 'PENDING',
              scheduledAt: new Date(now + 900_000),
            },
            {
              email: 'marcus@fieldwork.example',
              senderId: 'demo-sender',
              status: 'THROTTLED_DELAYED',
              scheduledAt: new Date(now + 3_600_000),
            },
          ],
        },
      },
    });
  }

  return user;
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
    isDemo: user.googleId === 'local-demo-user' || user.googleId === 'hosted-demo-user',
    simulatedDelivery: isEmailSimulationEnabled(),
    slackConnected: Boolean(user.slackConnection),
    slackConfigured: Boolean(env.slack.clientId && env.slack.clientSecret),
  };
}
