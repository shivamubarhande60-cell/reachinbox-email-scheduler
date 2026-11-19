import { Router } from 'express';
import { env } from '../config/env';
import { BadRequestError } from '../errors/AppError';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  connectSlackFromCallback,
  createSlackAuthUrl,
  disconnectSlack,
  isSlackConnected,
} from '../services/slackService';

export const slackOAuthRouter = Router();
export const slackApiRouter = Router();

slackOAuthRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const url = await createSlackAuthUrl(userId);
    res.redirect(url);
  }),
);

slackOAuthRouter.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Slack did not return a valid authorization response.');
    return;
  }

  try {
    await connectSlackFromCallback(code, state);
    res.redirect(`${env.frontendUrl}/?slack=connected`);
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).send(error.message);
      return;
    }
    console.error('Slack connection failed:', error);
    res.status(502).send('Slack connection failed. Check the server logs and try again.');
  }
});

slackApiRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const connected = await isSlackConnected(userId);
    res.json({ status: 'Success', connected });
  }),
);

slackApiRouter.delete(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    await disconnectSlack(userId);
    res.json({ status: 'Success' });
  }),
);
