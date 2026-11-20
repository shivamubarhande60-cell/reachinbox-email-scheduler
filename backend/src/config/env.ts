import 'dotenv/config';

export type SameSitePolicy = 'lax' | 'strict' | 'none';

/**
 * Resolves the public frontend origin used for CORS and OAuth redirects.
 * Supports explicit FRONTEND_URL or Railway's RAILWAY_PUBLIC_DOMAIN.
 */
function resolveFrontendUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return 'http://localhost:5173';
}

function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number, name: string): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
}

function parseSameSite(raw: string | undefined): SameSitePolicy {
  const value = (raw || 'lax').toLowerCase();
  if (value !== 'lax' && value !== 'strict' && value !== 'none') {
    throw new Error('SESSION_COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  return value;
}

/**
 * Centralized environment configuration for the backend API and workers.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  frontendUrl: resolveFrontendUrl(),
  frontendDistDir: process.env.FRONTEND_DIST_DIR || '',

  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
  },

  session: {
    secret: process.env.SESSION_SECRET || '',
    sameSite: parseSameSite(process.env.SESSION_COOKIE_SAME_SITE),
  },

  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    callbackUrl: process.env.SLACK_CALLBACK_URL || '',
  },

  smtp: {
    sendersJson: process.env.SMTP_SENDERS || '',
    user: process.env.SMTP_USER || process.env.ETHEREAL_USER || '',
    pass: process.env.SMTP_PASS || process.env.ETHEREAL_PASS || '',
    from: process.env.SMTP_FROM || '',
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT || 587),
  },

  demo: {
    emailSimulationMode: process.env.DEMO_EMAIL_MODE,
    enableLocalDemoLogin: process.env.ENABLE_LOCAL_DEMO_LOGIN,
  },

  rateLimit: {
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    minimumDelayMs: Number(process.env.EMAIL_DELAY_MS || 2000),
    maxEmailsPerHourPerSender: Number(
      process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || process.env.MAX_EMAILS_PER_HOUR || 200,
    ),
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
};

/**
 * Ensures a required environment variable is present before use.
 */
export function requireConfig(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} must be set in the backend environment.`);
  }
  return value;
}

/**
 * Validates critical startup configuration values and fails fast on misconfiguration.
 */
export function validateStartupConfig(): void {
  requireConfig(env.session.secret, 'SESSION_SECRET');
  if (env.session.secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  parsePositiveInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || process.env.MAX_EMAILS_PER_HOUR,
    200,
    'MAX_EMAILS_PER_HOUR_PER_SENDER',
  );
  parseNonNegativeInt(process.env.EMAIL_DELAY_MS, 2000, 'EMAIL_DELAY_MS');
  parsePositiveInt(process.env.WORKER_CONCURRENCY, 5, 'WORKER_CONCURRENCY');
}
