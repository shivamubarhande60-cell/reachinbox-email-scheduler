import nodemailer, { type Transporter } from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/AppError';
import { decryptSecret, encryptSecret } from '../lib/crypto';
import prisma from '../lib/prisma';
import {
  getHttpProviderHost,
  parseEmailTransport,
  verifyHttpProviderSender,
  type EmailTransport,
} from './emailDelivery';
import { isEmailSimulationEnabled } from './emailDeliveryMode';

export interface Sender {
  id: string;
  name: string;
  from: string;
  transport: EmailTransport;
  host: string;
  port: number;
  user: string;
  pass: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
  managed?: boolean;
  simulated?: boolean;
}

export class SenderInputError extends BadRequestError {
  constructor(message: string) {
    super(message, 'SENDER_INPUT_ERROR');
  }
}

export class SenderConnectionError extends BadRequestError {
  constructor(message: string) {
    super(message, 'SENDER_CONNECTION_ERROR');
  }
}

export class SenderNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message, 'SENDER_NOT_FOUND');
  }
}

export class SenderInUseError extends ConflictError {
  constructor(message: string) {
    super(message, 'SENDER_IN_USE');
  }
}

const configuredHourlyLimit = env.rateLimit.maxEmailsPerHourPerSender;
const configuredMinimumDelayMs = env.rateLimit.minimumDelayMs;

function loadSenders(): Sender[] {
  if (isEmailSimulationEnabled()) {
    return [
      {
        id: 'render-demo-sender',
        name: 'Render demo (simulated)',
        from: 'demo@reachinbox.invalid',
        transport: 'smtp',
        host: 'simulation.local',
        port: 0,
        user: '',
        pass: '',
        maxEmailsPerHour: configuredHourlyLimit,
        minimumDelayMs: configuredMinimumDelayMs,
        simulated: true,
      },
    ];
  }

  if (env.smtp.sendersJson) {
    const parsed = JSON.parse(env.smtp.sendersJson) as Sender[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('SMTP_SENDERS must be a non-empty JSON array.');
    }
    const ids = new Set<string>();
    for (const sender of parsed) {
      if (!sender.id || !sender.name || !sender.from || !sender.host || !sender.user || !sender.pass) {
        throw new Error('Each SMTP sender needs id, name, from, host, user, and pass.');
      }
      if (ids.has(sender.id)) {
        throw new Error(`SMTP sender id "${sender.id}" is configured more than once.`);
      }
      ids.add(sender.id);
    }
    return parsed.map((sender) => ({
      ...sender,
      transport: parseEmailTransport(sender.transport),
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs: configuredMinimumDelayMs,
    }));
  }

  if (env.smtp.user && env.smtp.pass) {
    return [
      {
        id: 'default',
        name: 'Default sender',
        from: env.smtp.from || env.smtp.user,
        transport: 'smtp',
        host: env.smtp.host,
        port: env.smtp.port,
        user: env.smtp.user,
        pass: env.smtp.pass,
        maxEmailsPerHour: configuredHourlyLimit,
        minimumDelayMs: configuredMinimumDelayMs,
      },
    ];
  }

  return [];
}

export const senders = loadSenders();

const transporters = new Map<string, Transporter>();

function toSender(record: {
  id: string;
  name: string;
  from: string;
  transport: string;
  host: string;
  port: number;
  username: string;
  encryptedPassword: string;
  passwordIv: string;
  passwordTag: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
}): Sender {
  return {
    id: record.id,
    name: record.name,
    from: record.from,
    transport: parseEmailTransport(record.transport),
    host: record.host,
    port: record.port,
    user: record.username,
    pass: decryptSecret(record.encryptedPassword, record.passwordIv, record.passwordTag),
    maxEmailsPerHour: record.maxEmailsPerHour,
    minimumDelayMs: record.minimumDelayMs,
    managed: true,
  };
}

/**
 * Lists both environment-configured and user-managed email senders.
 */
export async function listSenders(userId: number): Promise<Sender[]> {
  if (isEmailSimulationEnabled()) return senders;

  const managed = await prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return [...senders, ...managed.map(toSender)];
}

/**
 * Resolves a sender by ID for a specific user (managed or environment-configured).
 */
export async function getSender(id: string, userId: number): Promise<Sender | undefined> {
  if (isEmailSimulationEnabled()) {
    const configuredSender = senders.find((sender) => sender.id === id);
    if (configuredSender) return configuredSender;
    const managed = await prisma.sender.findFirst({ where: { id, userId } });
    return managed ? { ...toSender(managed), simulated: true } : undefined;
  }

  const managed = await prisma.sender.findFirst({ where: { id, userId } });
  if (managed) return toSender(managed);
  return senders.find((sender) => sender.id === id);
}

/**
 * Returns a cached Nodemailer transporter for the given SMTP sender.
 */
export function getTransporter(sender: Sender): Transporter {
  let transporter = transporters.get(sender.id);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.host,
      port: sender.port,
      secure: sender.port === 465,
      auth: { user: sender.user, pass: sender.pass },
      connectionTimeout: 10000,
      socketTimeout: 60000,
    });
    transporters.set(sender.id, transporter);
  }
  return transporter;
}

/**
 * Verifies SMTP connectivity and credentials for a sender.
 */
export async function verifySender(sender: Sender): Promise<void> {
  await getTransporter(sender).verify();
}

/**
 * Validates, verifies connectivity (HTTPS API or SMTP), encrypts credentials, and stores a managed sender.
 */
export async function createManagedSender(
  userId: number,
  input: unknown,
  limits: { maxEmailsPerHour: number; minimumDelayMs: number; etherealOnly?: boolean },
): Promise<void> {
  if (isEmailSimulationEnabled()) {
    throw new SenderInputError('Demo delivery is enabled. No email sender credentials are needed.');
  }

  const data =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const transport = parseEmailTransport(data.transport);
  const { name, from, host, port, username, password, apiKey, maxEmailsPerHour, minimumDelayMs } =
    data;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 120 ||
    typeof from !== 'string' ||
    from.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim())
  ) {
    throw new SenderInputError('Provide a valid sender name and email address.');
  }

  const hourlyLimit = Number(maxEmailsPerHour);
  const delayMs = Number(minimumDelayMs);
  if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > limits.maxEmailsPerHour) {
    throw new SenderInputError(`Hourly limit must be between 1 and ${limits.maxEmailsPerHour}.`);
  }
  if (!Number.isInteger(delayMs) || delayMs < limits.minimumDelayMs || delayMs > 86400000) {
    throw new SenderInputError(
      `Minimum delay must be between ${limits.minimumDelayMs} and 86,400,000 milliseconds.`,
    );
  }

  const id = `managed-${randomUUID()}`;

  if (transport !== 'smtp') {
    if (limits.etherealOnly) {
      throw new SenderInputError('Local preview can only use Ethereal SMTP.');
    }

    const rawApiKey =
      typeof apiKey === 'string' && apiKey.trim()
        ? apiKey.trim()
        : typeof password === 'string'
          ? password.trim()
          : '';
    if (!rawApiKey || rawApiKey.length > 4096) {
      throw new SenderInputError(`Provide a valid ${transport} API key.`);
    }

    try {
      await verifyHttpProviderSender(transport, rawApiKey);
    } catch (error) {
      throw new SenderConnectionError(
        error instanceof Error
          ? error.message
          : `Could not verify ${transport} API key.`,
      );
    }

    const encrypted = encryptSecret(rawApiKey);
    await prisma.sender.create({
      data: {
        id,
        userId,
        name: name.trim(),
        from: from.trim(),
        transport,
        host: getHttpProviderHost(transport),
        port: 443,
        username: transport,
        encryptedPassword: encrypted.encryptedValue,
        passwordIv: encrypted.iv,
        passwordTag: encrypted.tag,
        maxEmailsPerHour: hourlyLimit,
        minimumDelayMs: delayMs,
      },
    });
    return;
  }

  const cleanHost = typeof host === 'string' ? host.trim() : '';
  if (
    !cleanHost ||
    cleanHost.length > 255 ||
    /\s/.test(cleanHost) ||
    typeof username !== 'string' ||
    !username.trim() ||
    username.trim().length > 255 ||
    typeof password !== 'string' ||
    !password.trim() ||
    password.length > 4096
  ) {
    throw new SenderInputError('Provide a valid SMTP host, username, and password.');
  }
  if (limits.etherealOnly && cleanHost.toLowerCase() !== 'smtp.ethereal.email') {
    throw new SenderInputError('Local preview can only use Ethereal SMTP.');
  }

  const smtpPort = Number(port);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new SenderInputError('SMTP port must be between 1 and 65,535.');
  }

  const sender: Sender = {
    id,
    name: name.trim(),
    from: from.trim(),
    transport: 'smtp',
    host: cleanHost,
    port: smtpPort,
    user: username.trim(),
    pass: password,
    maxEmailsPerHour: hourlyLimit,
    minimumDelayMs: delayMs,
    managed: true,
  };
  const encrypted = encryptSecret(password);
  try {
    await verifySender(sender);
  } catch {
    throw new SenderConnectionError(
      'Could not connect to this SMTP server. Check the host, port, username, and password.',
    );
  } finally {
    closeTransporter(id);
  }

  await prisma.sender.create({
    data: {
      id,
      userId,
      name: sender.name,
      from: sender.from,
      transport: 'smtp',
      host: sender.host,
      port: sender.port,
      username: sender.user,
      encryptedPassword: encrypted.encryptedValue,
      passwordIv: encrypted.iv,
      passwordTag: encrypted.tag,
      maxEmailsPerHour: sender.maxEmailsPerHour,
      minimumDelayMs: sender.minimumDelayMs,
    },
  });
}

/**
 * Deletes a user-managed sender if no active/pending emails reference it.
 */
export async function removeManagedSender(userId: number, senderId: string): Promise<void> {
  const sender = await prisma.sender.findFirst({ where: { id: senderId, userId }, select: { id: true } });
  if (!sender) throw new SenderNotFoundError('Managed sender not found.');

  const pendingEmails = await prisma.lead.count({
    where: {
      senderId,
      status: { in: ['PENDING', 'SENDING', 'THROTTLED_DELAYED'] },
      campaign: { is: { userId } },
    },
  });
  if (pendingEmails > 0) {
    throw new SenderInUseError(
      'This sender still has scheduled emails. Wait for them to finish before removing it.',
    );
  }
  await prisma.sender.delete({ where: { id: senderId } });
  closeTransporter(senderId);
}

/**
 * Closes and removes a cached Nodemailer transporter.
 */
export function closeTransporter(senderId: string): void {
  const transporter = transporters.get(senderId);
  if (!transporter) return;
  transporter.close();
  transporters.delete(senderId);
}
