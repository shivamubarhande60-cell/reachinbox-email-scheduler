import { Router } from 'express';
import { BadRequestError } from '../errors/AppError';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { searchUserEmails } from '../services/searchService';

export const emailRouter = Router();

emailRouter.use(requireAuth);

emailRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      throw new BadRequestError('Enter a search query.');
    }

    const result = await searchUserEmails(userId, query);
    res.json({
      status: 'Success',
      source: result.source,
      count: result.data.length,
      data: result.data,
    });
  }),
);
