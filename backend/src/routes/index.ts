import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Router } from 'express';
import { requireBullBoardAuth } from '../middleware/auth';
import { emailIndexQueue, emailQueue } from '../queues/emailQueue';
import { authApiRouter, oauthRouter } from './authRoutes';
import { campaignRouter } from './campaignRoutes';
import { emailRouter } from './emailRoutes';
import { healthRouter } from './healthRoutes';
import { senderRouter } from './senderRoutes';
import { slackApiRouter, slackOAuthRouter } from './slackRoutes';

/**
 * Registers all application routes, versioned API endpoints, OAuth callbacks, and Bull Board.
 */
export function createRootRouter(): Router {
  const router = Router();

  // Healthcheck
  router.use(healthRouter);

  // OAuth browser redirect & callback routes
  router.use('/auth', oauthRouter);
  router.use('/auth/slack', slackOAuthRouter);

  // Versioned API router (mounted at both /api/v1 and /api for backward compatibility)
  const apiRouter = Router();
  apiRouter.use('/auth', authApiRouter);
  apiRouter.use('/slack', slackApiRouter);
  apiRouter.use('/senders', senderRouter);
  apiRouter.use('/campaigns', campaignRouter);
  apiRouter.use('/emails', emailRouter);

  router.use('/api/v1', apiRouter);
  router.use('/api', apiRouter);

  // Bull Board queue inspection UI
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(emailIndexQueue)],
    serverAdapter,
  });
  router.use('/admin/queues', requireBullBoardAuth, serverAdapter.getRouter());

  return router;
}
