import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { listUserCampaigns, scheduleCampaign } from '../services/campaignService';

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

campaignRouter.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const result = await scheduleCampaign({
      userId,
      body: req.body,
      idempotencyKeyHeader: req.get('Idempotency-Key'),
    });

    res.status(201).json({
      status: 'Success',
      message: `Scheduled ${result.count} emails.`,
      campaignId: result.campaignId,
      count: result.count,
    });
  }),
);

campaignRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const campaigns = await listUserCampaigns(userId);
    res.json({ status: 'Success', data: campaigns });
  }),
);
