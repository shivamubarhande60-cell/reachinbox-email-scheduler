import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Wraps an async Express route handler so rejected promises are forwarded to the global error handler.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Handles unmatched API routes with a consistent JSON 404 response.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'Error',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found.`,
  });
}

/**
 * Global Express error handling middleware.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    if (!error.isOperational || error.statusCode >= 500) {
      console.error(`[${error.code}]`, error);
    }
    res.status(error.statusCode).json({
      status: 'Error',
      code: error.code,
      message: error.message,
    });
    return;
  }

  console.error('Unhandled API error:', error);
  res.status(500).json({
    status: 'Error',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected server error occurred.',
  });
}
