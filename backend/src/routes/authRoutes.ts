import { Router } from 'express';
import { env } from '../config/env';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticateGoogleCallback,
  createGoogleAuthUrl,
  getCurrentUserProfile,
  upsertLocalDemoUser,
} from '../services/authService';
import { isLocalDemoEnabled } from '../services/localDemo';
import { clearSessionCookie, setSessionCookie } from '../services/sessionService';

export const oauthRouter = Router();
export const authApiRouter = Router();

oauthRouter.get(
  '/google',
  asyncHandler(async (_req, res) => {
    const url = await createGoogleAuthUrl();
    res.redirect(url);
  }),
);

oauthRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Google did not return a valid authorization response.');
    return;
  }

  try {
    const user = await authenticateGoogleCallback(code, state);
    setSessionCookie(res, user.id);
    res.redirect(env.frontendUrl);
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).send(error.message);
      return;
    }
    console.error('Google sign-in failed:', error);
    res.status(502).send('Google sign-in failed. Check the server logs and try again.');
  }
});

authApiRouter.get('/demo-status', (req, res) => {
  res.json({
    enabled: isLocalDemoEnabled(env.nodeEnv, env.demo.enableLocalDemoLogin, req.socket.remoteAddress),
  });
});

authApiRouter.post(
  '/demo',
  asyncHandler(async (req, res) => {
    if (!isLocalDemoEnabled(env.nodeEnv, env.demo.enableLocalDemoLogin, req.socket.remoteAddress)) {
      throw new NotFoundError('Local preview is disabled.');
    }

    const user = await upsertLocalDemoUser();
    setSessionCookie(res, user.id);
    res.json({ status: 'Success' });
  }),
);

authApiRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    try {
      const profile = await getCurrentUserProfile(userId);
      res.json({ status: 'Success', data: profile });
    } catch (error) {
      clearSessionCookie(res);
      throw error;
    }
  }),
);

authApiRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ status: 'Success' });
});
