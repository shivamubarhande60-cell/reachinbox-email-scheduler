import nodemailer, { type Transporter } from 'nodemailer';
import { randomUUID } from 'node:crypto';
import prisma from './database';
import { isEmailSimulationEnabled } from './emailDeliveryMode';
import { decryptSecret, encryptSecret } from './tokenEncryption';

export interface Sender {
  id: string;
  name: string;
  from: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
  managed?: boolean;
  simulated?: boolean;
}

const configuredHourlyLimit = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || process.env.MAX_EMAILS_PER_HOUR || 200);
const configuredMinimumDelayMs = Number(process.env.EMAIL_DELAY_MS || 2000);

export class SenderInputError extends Error {}
export class SenderConnectionError extends Error {}
export class SenderNotFoundError extends Error {}
export class SenderInUseError extends Error {}

function loadSenders(): Sender[] {
  if (isEmailSimulationEnabled()) {
    return [{
      id: 'render-demo-sender',
      name: 'Render demo (simulated)',
      from: 'demo@reachinbox.invalid',
      host: 'simulation.local',
      port: 0,
      user: '',
      pass: '',
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs: configuredMinimumDelayMs,
      simulated: true,
    }];
  }

  const configured = process.env.SMTP_SENDERS;
  if (configured) {
    const senders = JSON.parse(configured) as Sender[];
    if (!Array.isArray(senders) || senders.length === 0) {
      throw new Error('SMTP_SENDERS must be a non-empty JSON array.');
    }
    const ids = new Set<string>();
    for (const sender of senders) {
      if (!sender.id || !sender.name || !sender.from || !sender.host || !sender.user || !sender.pass) {
        throw new Error('Each SMTP sender needs id, name, from, host, user, and pass.');
      }
      if (ids.has(sender.id)) {
        throw new Error(`SMTP sender id "${sender.id}" is configured more than once.`);
      }
      ids.add(sender.id);
    }
    return senders.map((sender) => ({
      ...sender,
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs: configuredMinimumDelayMs,
    }));
  }

  const user = process.env.SMTP_USER || process.env.ETHEREAL_USER;
  const pass = process.env.SMTP_PASS || process.env.ETHEREAL_PASS;
  if (user && pass) {
    return [{
      id: 'default',
      name: 'Default sender',
      from: process.env.SMTP_FROM || user,
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT || 587),
      user,
      pass,
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs: configuredMinimumDelayMs,
    }];
  }

  return [];
}

export const senders = loadSenders();

const transporters = new Map<string, Transporter>();

function toSender(record: {
  id: string;
  name: string;
  from: string;
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
    host: record.host,
    port: record.port,
    user: record.username,
    pass: decryptSecret(record.encryptedPassword, record.passwordIv, record.passwordTag),
    maxEmailsPerHour: record.maxEmailsPerHour,
    minimumDelayMs: record.minimumDelayMs,
    managed: true,
  };
}

export async function listSenders(userId: number) {
  if (isEmailSimulationEnabled()) return senders;

  const managed = await prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return [...senders, ...managed.map(toSender)];
}

export async function getSender(id: string, userId: number) {
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

export function getTransporter(sender: Sender) {
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

export async function verifySender(sender: Sender) {
  await getTransporter(sender).verify();
}

export async function createManagedSender(
  userId: number,
  input: unknown,
  limits: { maxEmailsPerHour: number; minimumDelayMs: number; etherealOnly?: boolean },
) {
  if (isEmailSimulationEnabled()) {
    throw new SenderInputError('Demo delivery is enabled. No SMTP sender credentials are needed.');
  }

  const data = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const { name, from, host, port, username, password, maxEmailsPerHour, minimumDelayMs } = data;
  const cleanHost = typeof host === 'string' ? host.trim() : '';
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120
    || typeof from !== 'string' || from.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim())
    || !cleanHost || cleanHost.length > 255 || /\s/.test(cleanHost)
    || typeof username !== 'string' || !username.trim() || username.trim().length > 255
    || typeof password !== 'string' || !password.trim() || password.length > 4096) {
    throw new SenderInputError('Provide a valid sender name, email, SMTP host, username, and password.');
  }
  if (limits.etherealOnly && cleanHost.toLowerCase() !== 'smtp.ethereal.email') {
    throw new SenderInputError('Local preview can only use Ethereal SMTP.');
  }

  const smtpPort = Number(port);
  const hourlyLimit = Number(maxEmailsPerHour);
  const delayMs = Number(minimumDelayMs);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new SenderInputError('SMTP port must be between 1 and 65,535.');
  }
  if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > limits.maxEmailsPerHour) {
    throw new SenderInputError(`Hourly limit must be between 1 and ${limits.maxEmailsPerHour}.`);
  }
  if (!Number.isInteger(delayMs) || delayMs < limits.minimumDelayMs || delayMs > 86400000) {
    throw new SenderInputError(`Minimum delay must be between ${limits.minimumDelayMs} and 86,400,000 milliseconds.`);
  }

  const id = `managed-${randomUUID()}`;
  const sender: Sender = {
    id,
    name: name.trim(),
    from: from.trim(),
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
    throw new SenderConnectionError('Could not connect to this SMTP server. Check the host, port, username, and password.');
  } finally {
    closeTransporter(id);
  }

  await prisma.sender.create({
    data: {
      id,
      userId,
      name: sender.name,
      from: sender.from,
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

export async function removeManagedSender(userId: number, senderId: string) {
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
    throw new SenderInUseError('This sender still has scheduled emails. Wait for them to finish before removing it.');
  }
  await prisma.sender.delete({ where: { id: senderId } });
  closeTransporter(senderId);
}

export function closeTransporter(senderId: string) {
  const transporter = transporters.get(senderId);
  if (!transporter) return;
  transporter.close();
  transporters.delete(senderId);
}
