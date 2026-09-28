import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const cookieName = 'reachinbox_session';
const sessionDurationSeconds = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function setSessionCookie(response: Response, userId: number) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + sessionDurationSeconds * 1000,
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationSeconds}${secure}`,
  );
}

export function clearSessionCookie(response: Response) {
  response.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function getSessionUserId(request: Request): number | null {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
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
