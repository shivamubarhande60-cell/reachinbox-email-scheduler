import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { Prisma } from '@prisma/client';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailIndexQueue, emailQueue, redisConnection } from './queues/emailQueue';
import { closeWorkers } from './workers/emailWorker';
import { initElasticsearch, esClient } from '../services/elasticsearch';
import prisma from '../services/database';
import {
  createManagedSender,
  getSender,
  listSenders,
  removeManagedSender,
  SenderConnectionError,
  SenderInputError,
  SenderInUseError,
  SenderNotFoundError,
  senders,
} from '../services/senders';
import { isLocalDemoEnabled } from '../services/localDemo';
import { clearSessionCookie, getSessionUserId, setSessionCookie } from '../services/session';
import { validateScheduleInput } from './services/scheduleValidation';
import { encryptSecret, encryptToken } from '../services/tokenEncryption';

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
const configuredHourlyLimit = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || process.env.MAX_EMAILS_PER_HOUR || 200);
const minimumDelayMs = Number(process.env.EMAIL_DELAY_MS || 2000);
let httpServer: ReturnType<typeof app.listen> | undefined;
let shuttingDown = false;
const localDevelopmentOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
]);

app.use(cors({
  origin: (origin, callback) => {
    const isAllowed = origin === undefined
      || origin === frontendUrl
      || (process.env.NODE_ENV !== 'production' && localDevelopmentOrigins.has(origin));
    callback(null, isAllowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

function requireConfiguration(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} must be set in the backend environment.`);
  return value;
}

function oauthStateKey(provider: string, state: string) {
  return `oauth-state:${provider}:${state}`;
}

function googleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || new URL('/auth/google/callback', frontendUrl).toString();
}

function slackCallbackUrl() {
  return process.env.SLACK_CALLBACK_URL || new URL('/auth/slack/callback', frontendUrl).toString();
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function createEmailJobs(leads: Array<{
  id: number;
  email: string;
  senderId: string;
  scheduledAt: Date | null;
  campaign: { subject: string; body: string };
}>) {
  if (leads.length) {
    await emailQueue.addBulk(leads.map((lead) => ({
      name: 'send-email',
      data: { leadId: lead.id },
      opts: {
        jobId: `email-${lead.id}`,
        delay: Math.max(0, (lead.scheduledAt?.getTime() || Date.now()) - Date.now()),
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    })));
  }
}

async function createIndexJobs(leadIds: number[], reason = 'scheduled') {
  if (leadIds.length) {
    await emailIndexQueue.addBulk(leadIds.map((leadId) => ({
      name: 'index-email',
      data: { leadId },
      opts: {
        jobId: `index-${leadId}-${reason}`,
        attempts: 10,
        backoff: { type: 'exponential' as const, delay: 1000 },
        removeOnComplete: false,
        removeOnFail: true,
      },
    })));
  }
}

function getRequestUserId(request: express.Request, response: express.Response) {
  const userId = getSessionUserId(request);
  if (!userId) {
    response.status(401).json({ status: 'Error', message: 'Please sign in with Google.' });
    return null;
  }
  return userId;
}

app.get('/auth/google', async (_request, response) => {
  try {
    const clientId = requireConfiguration(process.env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID');
    const redirectUri = googleCallbackUrl();
    const state = randomBytes(32).toString('hex');
    await redisConnection.set(oauthStateKey('google', state), '1', 'EX', 600);

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    response.redirect(url.toString());
  } catch (error) {
    console.error('Could not start Google sign-in:', error);
    response.status(503).json({ status: 'Error', message: errorMessage(error) });
  }
});

app.get('/api/auth/demo-status', (request, response) => {
  response.json({
    enabled: isLocalDemoEnabled(process.env.NODE_ENV, process.env.ENABLE_LOCAL_DEMO_LOGIN, request.socket.remoteAddress),
  });
});

app.post('/api/auth/demo', async (request, response) => {
  if (!isLocalDemoEnabled(process.env.NODE_ENV, process.env.ENABLE_LOCAL_DEMO_LOGIN, request.socket.remoteAddress)) {
    response.status(404).json({ status: 'Error', message: 'Local preview is disabled.' });
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { googleId: 'local-demo-user' },
      create: {
        googleId: 'local-demo-user',
        email: 'preview@localhost.invalid',
        name: 'Local Preview',
      },
      update: {},
    });
    setSessionCookie(response, user.id);
    response.json({ status: 'Success' });
  } catch (error) {
    console.error('Could not start local preview:', error);
    response.status(500).json({ status: 'Error', message: 'Could not start local preview.' });
  }
});

app.get('/auth/google/callback', async (request, response) => {
  const { code, state } = request.query;
  if (!isString(code) || !isString(state)) {
    response.status(400).send('Google did not return a valid authorization response.');
    return;
  }

  try {
    const stateKey = oauthStateKey('google', state);
    if (!(await redisConnection.getdel(stateKey))) {
      response.status(400).send('Google sign-in expired. Please try again.');
      return;
    }

    const clientId = requireConfiguration(process.env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID');
    const clientSecret = requireConfiguration(process.env.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET');
    const redirectUri = googleCallbackUrl();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(`Google token exchange failed: ${tokenData.error || tokenResponse.statusText}`);
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json() as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };
    if (!profileResponse.ok || !profile.id || !profile.email || !profile.name || !profile.verified_email) {
      throw new Error('Google did not return a verified email profile.');
    }

    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      create: {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      update: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
    });
    setSessionCookie(response, user.id);
    response.redirect(frontendUrl);
  } catch (error) {
    console.error('Google sign-in failed:', error);
    response.status(502).send('Google sign-in failed. Check the server logs and try again.');
  }
});

app.get('/auth/slack', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;

  try {
    const clientId = requireConfiguration(process.env.SLACK_CLIENT_ID, 'SLACK_CLIENT_ID');
    const redirectUri = slackCallbackUrl();
    const state = randomBytes(32).toString('hex');
    await redisConnection.set(oauthStateKey('slack', state), String(userId), 'EX', 600);

    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'chat:write,im:write',
      state,
    }).toString();
    response.redirect(url.toString());
  } catch (error) {
    console.error('Could not start Slack connection:', error);
    response.status(503).json({ status: 'Error', message: errorMessage(error) });
  }
});

app.get('/auth/slack/callback', async (request, response) => {
  const { code, state } = request.query;
  if (!isString(code) || !isString(state)) {
    response.status(400).send('Slack did not return a valid authorization response.');
    return;
  }

  try {
    const stateKey = oauthStateKey('slack', state);
    const userId = Number(await redisConnection.getdel(stateKey));
    if (!Number.isInteger(userId) || userId < 1) {
      response.status(400).send('Slack connection expired. Please try again.');
      return;
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: requireConfiguration(process.env.SLACK_CLIENT_ID, 'SLACK_CLIENT_ID'),
        client_secret: requireConfiguration(process.env.SLACK_CLIENT_SECRET, 'SLACK_CLIENT_SECRET'),
        redirect_uri: slackCallbackUrl(),
      }),
    });
    const tokenData = await tokenResponse.json() as {
      ok?: boolean;
      error?: string;
      access_token?: string;
      authed_user?: { id?: string; access_token?: string };
    };
    if (!tokenResponse.ok || !tokenData.ok || !tokenData.access_token || !tokenData.authed_user?.id) {
      throw new Error(`Slack token exchange failed: ${tokenData.error || tokenResponse.statusText}`);
    }

    const storedToken = tokenData.authed_user.access_token || tokenData.access_token;
    const encryptedToken = encryptToken(storedToken);
    await prisma.slackConnection.upsert({
      where: { userId },
      create: {
        userId,
        slackUserId: tokenData.authed_user.id,
        ...encryptedToken,
      },
      update: {
        slackUserId: tokenData.authed_user.id,
        ...encryptedToken,
      },
    });
    response.redirect(`${frontendUrl}/?slack=connected`);
  } catch (error) {
    console.error('Slack connection failed:', error);
    response.status(502).send('Slack connection failed. Check the server logs and try again.');
  }
});

app.get('/api/auth/me', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      picture: true,
      googleId: true,
      slackConnection: { select: { id: true } },
    },
  });
  if (!user) {
    clearSessionCookie(response);
    response.status(401).json({ status: 'Error', message: 'Session has expired. Please sign in again.' });
    return;
  }
  response.json({
    status: 'Success',
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      isDemo: user.googleId === 'local-demo-user',
      slackConnected: Boolean(user.slackConnection),
      slackConfigured: Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
    },
  });
});

app.post('/api/auth/logout', (_request, response) => {
  clearSessionCookie(response);
  response.json({ status: 'Success' });
});

app.get('/api/slack/status', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;
  const connection = await prisma.slackConnection.findUnique({ where: { userId }, select: { id: true } });
  response.json({ status: 'Success', connected: Boolean(connection) });
});

app.delete('/api/slack', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;
  await prisma.slackConnection.deleteMany({ where: { userId } });
  response.json({ status: 'Success' });
});


app.get('/api/senders', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;

  try {
    const configuredSenders = await listSenders(userId);

    response.json({
      status: 'Success',
      data: configuredSenders.map(({ id, name, from, maxEmailsPerHour: hourlyLimit, minimumDelayMs: delayMs, managed }) => ({
        id,
        name,
        from,
        maxEmailsPerHour: hourlyLimit ?? configuredHourlyLimit,
        minimumDelayMs: delayMs ?? minimumDelayMs,
        managed: managed === true,
      })),
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs,
    });
  } catch (error) {
    console.error('Could not load SMTP senders:', error);
    response.status(500).json({
      status: 'Error',
      message: 'Could not load your senders.',
    });
  }
});
app.post('/api/senders', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;
  try {
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { googleId: true } });
    await createManagedSender(userId, request.body, {
      maxEmailsPerHour: configuredHourlyLimit,
      minimumDelayMs,
      etherealOnly: account?.googleId === 'local-demo-user',
    });
    response.status(201).json({ status: 'Success', message: 'SMTP sender connected.' });
  } catch (error) {
    if (error instanceof SenderInputError || error instanceof SenderConnectionError) {
      response.status(400).json({ status: 'Error', message: error.message });
      return;
    }
    console.error('Could not save SMTP sender:', error);
    response.status(500).json({ status: 'Error', message: 'Could not save this sender.' });
  }
});

app.delete('/api/senders/:senderId', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;

  try {
    await removeManagedSender(userId, request.params.senderId);
    response.json({ status: 'Success', message: 'Sender removed.' });
  } catch (error) {
    if (error instanceof SenderNotFoundError || error instanceof SenderInUseError) {
      response.status(error instanceof SenderNotFoundError ? 404 : 409).json({ status: 'Error', message: error.message });
      return;
    }
    console.error('Could not remove SMTP sender:', error);
    response.status(500).json({ status: 'Error', message: 'Could not remove this sender.' });
  }
});

app.post('/api/campaigns/schedule', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;

  const input = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : {};
  const { campaignIdentifier, name, senderId } = input;
  if (!isString(senderId)) {
    response.status(503).json({ status: 'Error', message: 'Configure at least one SMTP sender before scheduling.' });
    return;
  }
  const sender = await getSender(senderId, userId);
  if (!sender) {
    response.status(400).json({ status: 'Error', message: 'Choose a configured email sender.' });
    return;
  }
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { googleId: true } });
  if (account?.googleId === 'local-demo-user' && sender.host.toLowerCase() !== 'smtp.ethereal.email') {
    response.status(403).json({ status: 'Error', message: 'Local preview can only send through Ethereal SMTP.' });
    return;
  }

  const validated = validateScheduleInput(request.body, {
    minimumDelayMs: sender.minimumDelayMs,
    maximumHourlyLimit: sender.maxEmailsPerHour,
  });
  if ('error' in validated) {
    response.status(400).json({ status: 'Error', message: validated.error });
    return;
  }
  const { subject, body, emails, startAt, delayMs, hourlyLimit } = validated.value;

  const requestKey = request.get('Idempotency-Key')
    || (isString(input.idempotencyKey) ? input.idempotencyKey : '');
  if (!requestKey.trim()) {
    response.status(400).json({ status: 'Error', message: 'Send a unique Idempotency-Key header with the schedule request.' });
    return;
  }
  const idempotencyKey = requestKey.trim();
  if (idempotencyKey.length > 191) {
    response.status(400).json({ status: 'Error', message: 'Idempotency key must be 191 characters or fewer.' });
    return;
  }

  try {
    let campaign = await prisma.campaign.findUnique({
      where: { idempotencyKey },
      include: { leads: { include: { campaign: { select: { subject: true, body: true } } } } },
    });
    if (campaign && campaign.userId !== userId) {
      response.status(409).json({ status: 'Error', message: 'Idempotency key is already in use.' });
      return;
    }
    if (!campaign) {
      try {
        campaign = await prisma.campaign.create({
          data: {
            name: (isString(campaignIdentifier) && campaignIdentifier.trim())
              || (isString(name) && name.trim())
              || `Campaign ${new Date().toLocaleDateString()}`,
            subject: subject.trim(),
            body: body.trim(),
            senderId,
            userId,
            startAt,
            delayMs,
            hourlyLimit,
            idempotencyKey,
            leads: {
              create: emails.map((email) => ({
                email,
                senderId,
                status: 'PENDING',
                scheduledAt: startAt,
              })),
            },
          },
          include: { leads: { include: { campaign: { select: { subject: true, body: true } } } } },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        campaign = await prisma.campaign.findUnique({
          where: { idempotencyKey },
          include: { leads: { include: { campaign: { select: { subject: true, body: true } } } } },
        });
        if (!campaign || campaign.userId !== userId) throw error;
      }
    }

    await createEmailJobs(campaign.leads);
    await createIndexJobs(campaign.leads.map((lead) => lead.id));
    response.status(201).json({
      status: 'Success',
      message: `Scheduled ${campaign.leads.length} emails.`,
      campaignId: campaign.id,
      count: campaign.leads.length,
    });
  } catch (error) {
    console.error('Could not schedule email campaign:', error);
    response.status(500).json({ status: 'Error', message: 'Could not schedule the email campaign.' });
  }
});

app.get('/api/campaigns', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: { leads: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    response.json({ status: 'Success', data: campaigns });
  } catch (error) {
    console.error('Could not load campaigns:', error);
    response.status(500).json({ status: 'Error', message: 'Could not load campaigns.' });
  }
});

app.get('/api/emails/search', async (request, response) => {
  const userId = getRequestUserId(request, response);
  if (!userId) return;
  const query = isString(request.query.q) ? request.query.q.trim() : '';
  if (!query) {
    response.status(400).json({ status: 'Error', message: 'Enter a search query.' });
    return;
  }

  try {
    const result = await esClient.search({
      index: 'emails',
      size: 100,
      query: {
        bool: {
          filter: [{ term: { userId } }],
          should: [{
            wildcard: {
              email: {
                value: `*${query.toLowerCase().replace(/[\\*?]/g, '\\$&')}*`,
                case_insensitive: true,
              },
            },
          }, {
            multi_match: {
              query,
              fields: ['subject', 'body', 'status'],
            },
          }],
          minimum_should_match: 1,
        },
      },
    });
    const data = result.hits.hits.flatMap((hit) => {
      const source = hit._source as {
        leadId?: number;
        email?: string;
        subject?: string;
        campaignName?: string;
        senderId?: string;
        status?: string;
        scheduledAt?: string | null;
        sentAt?: string | null;
      } | undefined;
      if (!source || typeof source.leadId !== 'number' || !source.email) return [];
      return [{
        id: source.leadId,
        email: source.email,
        subject: source.subject || '',
        name: source.campaignName || '',
        senderId: source.senderId || '',
        status: source.status || 'PENDING',
        scheduledAt: source.scheduledAt || null,
        sentAt: source.sentAt || null,
        errorMessage: null,
      }];
    });
    response.json({ status: 'Success', source: 'elasticsearch', count: data.length, data });
  } catch (error) {
    console.error('Elasticsearch search failed:', error);
    try {
      const data = await prisma.lead.findMany({
        where: {
          campaign: { userId },
          OR: [
            { email: { contains: query } },
            { campaign: { subject: { contains: query } } },
            { campaign: { body: { contains: query } } },
          ],
        },
        include: { campaign: { select: { name: true, subject: true } } },
        take: 100,
      });
      response.json({
        status: 'Success',
        source: 'mysql-fallback',
        count: data.length,
        data: data.map((lead) => ({
          id: lead.id,
          email: lead.email,
          subject: lead.campaign.subject,
          name: lead.campaign.name,
          senderId: lead.senderId,
          status: lead.status,
          scheduledAt: lead.scheduledAt,
          sentAt: lead.sentAt,
          errorMessage: lead.errorMessage,
        })),
      });
    } catch (databaseError) {
      console.error('Database search fallback failed:', databaseError);
      response.status(500).json({ status: 'Error', message: 'Email search is currently unavailable.' });
    }
  }
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(emailIndexQueue)],
  serverAdapter,
});
app.use('/admin/queues', (request, response, next) => {
  if (!getSessionUserId(request)) {
    response.status(401).send('Sign in to view queue status.');
    return;
  }
  next();
}, serverAdapter.getRouter());

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

const frontendDistDir = process.env.FRONTEND_DIST_DIR;
if (frontendDistDir) {
  app.use(express.static(frontendDistDir));
  app.get(/.*/, (request, response, next) => {
    if (request.path.startsWith('/api/') || request.path.startsWith('/auth/') || request.path.startsWith('/admin/')) {
      next();
      return;
    }
    response.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', error);
  response.status(500).json({ status: 'Error', message: 'An unexpected server error occurred.' });
});

async function recoverJobs() {
  const pendingLeads = await prisma.lead.findMany({
    where: { status: { in: ['PENDING', 'THROTTLED_DELAYED'] } },
    include: { campaign: { select: { subject: true, body: true } } },
  });
  await createEmailJobs(pendingLeads);

  const unindexedLeads = await prisma.lead.findMany({
    where: { indexedAt: null },
    select: { id: true },
  });
  await createIndexJobs(unindexedLeads.map((lead) => lead.id), `recovery-${Date.now()}`);
}

async function start() {
  requireConfiguration(process.env.SESSION_SECRET, 'SESSION_SECRET');
  if (configuredHourlyLimit < 1 || !Number.isInteger(configuredHourlyLimit)) {
    throw new Error('MAX_EMAILS_PER_HOUR_PER_SENDER must be a positive integer.');
  }
  if (minimumDelayMs < 0 || !Number.isInteger(minimumDelayMs)) {
    throw new Error('EMAIL_DELAY_MS must be a non-negative integer.');
  }
  if (!Number.isInteger(Number(process.env.WORKER_CONCURRENCY || 5)) || Number(process.env.WORKER_CONCURRENCY || 5) < 1) {
    throw new Error('WORKER_CONCURRENCY must be a positive integer.');
  }

  await prisma.$connect();
  await redisConnection.ping();
  try {
    await initElasticsearch();
  } catch (error) {
    console.warn('Elasticsearch is unavailable; search will use the MySQL fallback until it recovers.', errorMessage(error));
  }
  await recoverJobs();
  httpServer = app.listen(port, () => {
    console.log(`API and email worker listening on http://localhost:${port}`);
    console.log(`BullMQ dashboard: http://localhost:${port}/admin/queues`);
    console.log(`Configured SMTP senders: ${senders.length}`);
  });
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Stopping the API and draining email workers...');

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => error ? reject(error) : resolve());
      });
    }
    await Promise.all([
      closeWorkers(),
      emailQueue.close(),
      emailIndexQueue.close(),
      esClient.close(),
    ]);
    await redisConnection.quit();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

start().catch(async (error) => {
  console.error('Could not start ReachInbox:', error);
  await shutdown();
  process.exitCode = 1;
});
