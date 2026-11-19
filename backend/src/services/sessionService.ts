import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';

const COOKIE_NAME = 'reachinbox_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getCookieAttributes(maxAge: number): string {
  const { sameSite } = env.session;
  const secure = env.isProduction || sameSite === 'none';
  return `HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function getSecret(): string {
  const { secret } = env.session;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

/**
 * Sets a signed HTTP-only session cookie for the authenticated user.
 */
export function setSessionCookie(response: Response, userId: number): void {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
    }),
  ).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; ${getCookieAttributes(SESSION_DURATION_SECONDS)}`,
  );
}

/**
 * Clears the session cookie on sign-out or invalidation.
 */
export function clearSessionCookie(response: Response): void {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${getCookieAttributes(0)}`);
}

/**
 * Verifies the session cookie on an incoming request and returns the user ID, or null if invalid.
 */
export function getSessionUserId(request: Request): number | null {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!cookie) return null;

  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return null;

  try {
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      userId: number;
      expiresAt: number;
    };
    if (!Number.isInteger(session.userId) || session.expiresAt <= Date.now()) return null;
    return session.userId;
  } catch {
    return null;
  }
}
