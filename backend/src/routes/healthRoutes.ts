import { Router } from 'express';

export const healthRouter = Router();

/**
 * GET /health - Liveness probe endpoint for Railway/Docker healthchecks.
 */
healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
