import { BadRequestError } from '../errors/AppError';

export type EmailTransport = 'smtp' | 'resend' | 'brevo' | 'sendgrid';
export type HttpEmailTransport = Exclude<EmailTransport, 'smtp'>;

const VALID_TRANSPORTS = new Set<EmailTransport>(['smtp', 'resend', 'brevo', 'sendgrid']);

const PROVIDER_HOSTS: Record<HttpEmailTransport, string> = {
  brevo: 'api.brevo.com',
  resend: 'api.resend.com',
  sendgrid: 'api.sendgrid.com',
};

/**
 * Error thrown by HTTPS email API providers indicating whether the failure is safe to retry.
 */
export class HttpDeliveryError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'HttpDeliveryError';
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validates and normalizes an email transport identifier. Defaults to `smtp` when omitted.
 */
export function parseEmailTransport(value: unknown): EmailTransport {
  if (value === undefined || value === null || value === '') {
    return 'smtp';
  }
  if (typeof value !== 'string') {
    throw new BadRequestError('Unsupported email transport.');
  }
  const normalized = value.trim().toLowerCase() as EmailTransport;
  if (!VALID_TRANSPORTS.has(normalized)) {
    throw new BadRequestError(`Unsupported email transport "${value}".`);
  }
  return normalized;
}

/**
 * Returns the canonical API hostname stored for an HTTPS email transport.
 */
export function getHttpProviderHost(transport: HttpEmailTransport): string {
  return PROVIDER_HOSTS[transport];
}

async function readErrorDetail(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '');
  if (!raw) return response.statusText || `HTTP ${response.status}`;

  try {
    const parsed = JSON.parse(raw) as {
      message?: string;
      error?: string | { message?: string };
      errors?: Array<{ message?: string }>;
    };
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
    if (parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string') {
      return parsed.error.message;
    }
    if (Array.isArray(parsed.errors) && typeof parsed.errors[0]?.message === 'string') {
      return parsed.errors[0].message;
    }
  } catch {
    /* non-JSON error body */
  }

  return raw.slice(0, 300);
}

/**
 * Verifies an HTTPS email provider API key before saving the sender configuration.
 */
export async function verifyHttpProviderSender(
  transport: HttpEmailTransport,
  apiKey: string,
): Promise<void> {
  if (transport === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: { 'api-key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const detail = await readErrorDetail(res);
      throw new Error(`Brevo API key verification failed (${res.status}): ${detail}`);
    }
    return;
  }

  if (transport === 'resend') {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return;

    const detail = await readErrorDetail(res);
    if (res.status === 401 && detail.toLowerCase().includes('restricted to only send')) {
      return;
    }
    throw new Error(`Resend API key verification failed (${res.status}): ${detail}`);
  }

  const res = await fetch('https://api.sendgrid.com/v3/scopes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`SendGrid API key verification failed (${res.status}): ${detail}`);
  }
}

/**
 * Delivers an email message via an HTTPS provider REST API (port 443).
 */
export async function sendViaHttpProvider(
  sender: { transport: HttpEmailTransport; name: string; from: string; pass: string },
  message: { to: string; subject: string; text: string },
): Promise<void> {
  let url: string;
  let headers: Record<string, string>;
  let payload: unknown;

  if (sender.transport === 'brevo') {
    url = 'https://api.brevo.com/v3/smtp/email';
    headers = {
      'api-key': sender.pass,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    payload = {
      sender: { name: sender.name, email: sender.from },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    };
  } else if (sender.transport === 'resend') {
    url = 'https://api.resend.com/emails';
    headers = {
      Authorization: `Bearer ${sender.pass}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    payload = {
      from: `${sender.name} <${sender.from}>`,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    };
  } else {
    url = 'https://api.sendgrid.com/v3/mail/send';
    headers = {
      Authorization: `Bearer ${sender.pass}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    payload = {
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: sender.from, name: sender.name },
      subject: message.subject,
      content: [{ type: 'text/plain', value: message.text }],
    };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new HttpDeliveryError(`Network error contacting ${sender.transport}: ${msg}`, true);
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new HttpDeliveryError(
      `${sender.transport} delivery failed (${response.status}): ${detail}`,
      retryable,
    );
  }
}
