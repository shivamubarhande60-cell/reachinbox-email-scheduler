import { Router } from 'express';
import { env } from '../config/env';
import prisma from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { isEmailSimulationEnabled } from '../services/emailDeliveryMode';
import {
  createManagedSender,
  listSenders,
  removeManagedSender,
} from '../services/senderService';

export const senderRouter = Router();

const configuredHourlyLimit = env.rateLimit.maxEmailsPerHourPerSender;
const minimumDelayMs = env.rateLimit.minimumDelayMs;

senderRouter.use(requireAuth);

senderRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const configuredSenders = await listSenders(userId);

    res.json({
      status: 'Success',
      data: configuredSenders.map(({ id, name, from, maxEmailsPerHour, minimumDelayMs: delay, managed, simulated }) => ({
        id,
        name,
        from,
        maxEmailsPerHour: maxEmailsPerHour ?? configuredHourlyLimit,
        minimumDelayMs: delay ?? minimumDelayMs,
        managed: managed === true,
        simulated: simulated === true,
      })),
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs,
    });
  }),
);

senderRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { googleId: true } });

    await createManagedSender(userId, req.body, {
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs,
      etherealOnly: account?.googleId === 'local-demo-user' && !isEmailSimulationEnabled(),
    });

    res.status(201).json({ status: 'Success', message: 'SMTP sender connected.' });
  }),
);

senderRouter.delete(
  '/:senderId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const senderId = String(req.params.senderId);
    await removeManagedSender(userId, senderId);
    res.json({ status: 'Success', message: 'Sender removed.' });
  }),
);
