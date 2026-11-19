import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { getSessionUserId } from '../services/sessionService';

export interface AuthenticatedRequest extends Request {
  userId: number;
}

/**
 * Express middleware that requires a valid signed session cookie and attaches `req.userId`.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = getSessionUserId(req);
  if (!userId) {
    next(new UnauthorizedError('Please sign in with Google.'));
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  next();
}

/**
 * Express middleware protecting the Bull Board admin UI.
 */
export function requireBullBoardAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getSessionUserId(req)) {
    res.status(401).send('Sign in to view queue status.');
    return;
  }
  next();
}
