export interface ValidSchedule {
  subject: string;
  body: string;
  emails: string[];
  startAt: Date;
  delayMs: number;
  hourlyLimit: number;
}

type ValidationResult =
  | { value: ValidSchedule; error?: never }
  | { value?: never; error: string };

export function validateScheduleInput(
  input: unknown,
  defaults: { minimumDelayMs: number; maximumHourlyLimit: number },
): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const data = input as Record<string, unknown>;
  const { subject, body, emails, startTime, delayMs, hourlyLimit } = data;
  if (typeof subject !== 'string' || !subject.trim() || typeof body !== 'string' || !body.trim()) {
    return { error: 'Subject and email body are required.' };
  }
  if (subject.trim().length > 255) return { error: 'Subject must be 255 characters or fewer.' };
  if (!Array.isArray(emails) || emails.length === 0 || emails.length > 10000
    || !emails.every((email) => typeof email === 'string')) {
    return { error: 'Provide between 1 and 10,000 email addresses.' };
  }

  const cleanEmails = emails.map((email: string) => email.trim().toLowerCase());
  const invalidEmail = cleanEmails.find((email) => email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalidEmail) return { error: `Invalid email address: ${invalidEmail}` };

  const startAt = startTime === undefined
    ? new Date()
    : typeof startTime === 'string' ? new Date(startTime) : new Date(Number.NaN);
  if (Number.isNaN(startAt.getTime())) return { error: 'Start time must be a valid date.' };
  if (startTime !== undefined && startAt.getTime() <= Date.now()) {
    return { error: 'Start time must be in the future.' };
  }

  const perEmailDelay = delayMs === undefined ? defaults.minimumDelayMs : Number(delayMs);
  if (!Number.isInteger(perEmailDelay) || perEmailDelay < 0 || perEmailDelay > 86400000) {
    return { error: 'Delay must be between 0 and 86,400,000 milliseconds.' };
  }

  const perHourLimit = hourlyLimit === undefined ? defaults.maximumHourlyLimit : Number(hourlyLimit);
  if (!Number.isInteger(perHourLimit) || perHourLimit < 1 || perHourLimit > defaults.maximumHourlyLimit) {
    return { error: `Hourly limit must be between 1 and ${defaults.maximumHourlyLimit}.` };
  }

  return {
    value: {
      subject: subject.trim(),
      body: body.trim(),
      emails: [...new Set(cleanEmails)],
      startAt,
      delayMs: perEmailDelay,
      hourlyLimit: perHourLimit,
    },
  };
}
