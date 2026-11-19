import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Upload, X } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { campaignApi } from '../../services/campaignApi';
import { useDashboard } from '../../state/useDashboard';
import { formatDate, toLocalDateTimeInput } from '../../utils/date';
import { parseAddresses } from '../../utils/email';
import { AlertBanner } from '../common/AlertBanner';

function formatDurationEstimate(count: number, delaySeconds: number): string {
  if (count <= 1 || delaySeconds <= 0) return '< 5s';
  const totalSeconds = (count - 1) * delaySeconds;
  if (totalSeconds < 60) return `~${totalSeconds}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `~${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `~${hours}h ${remMinutes}m` : `~${hours}h`;
}

/**
 * Full-screen editorial composer for creating and scheduling an email campaign.
 */
export function ComposeModal() {
  const { senders, maxHourlyLimit, minimumDelayMs, setShowCompose, setMessage, loadDashboard } =
    useDashboard();

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderId, setSenderId] = useState(senders[0]?.id || '');
  const selectedSender = senders.find((sender) => sender.id === senderId);
  const [addresses, setAddresses] = useState('');
  const [startTime, setStartTime] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 5 * 60000)),
  );
  const [minimumStartTime] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60000)));
  const [delaySeconds, setDelaySeconds] = useState(
    Math.ceil((senders[0]?.minimumDelayMs ?? minimumDelayMs) / 1000),
  );
  const [hourlyLimit, setHourlyLimit] = useState(senders[0]?.maxEmailsPerHour ?? maxHourlyLimit);
  const senderHourlyLimit = selectedSender?.maxEmailsPerHour ?? maxHourlyLimit;
  const senderMinimumDelayMs = selectedSender?.minimumDelayMs ?? minimumDelayMs;
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setShowCompose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, setShowCompose]);

  const parsedEmails = useMemo(() => parseAddresses(addresses), [addresses]);
  const scheduledDate = new Date(startTime);
  const startTimeIsValid = !Number.isNaN(scheduledDate.getTime()) && startTime >= minimumStartTime;

  const removeRecipient = (emailToRemove: string) => {
    const nextEmails = parsedEmails.filter((email) => email !== emailToRemove);
    setAddresses(nextEmails.join(', '));
  };

  const loadLeads = async (file: File) => {
    try {
      setAddresses(await file.text());
      setError('');
    } catch {
      setError('Could not read that file. Try a CSV or plain text file.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startTimeIsValid) {
      setError('Choose a date and time in the future.');
      return;
    }
    if (!parsedEmails.length) {
      setError('Add at least one valid email address or upload a recipient list.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await campaignApi.scheduleCampaign(
        {
          ...(campaignName.trim() ? { name: campaignName.trim() } : {}),
          subject,
          body,
          emails: parsedEmails,
          senderId,
          startTime: scheduledDate.toISOString(),
          delayMs: delaySeconds * 1000,
          hourlyLimit,
        },
        idempotencyKey,
      );
      setIdempotencyKey(crypto.randomUUID());
      setMessage('Campaign scheduled. Delivery progress updates automatically.');
      void loadDashboard();
      setShowCompose(false);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not schedule these emails.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="compose-title"
      className="fixed inset-0 z-40 overflow-y-auto bg-[#fafafa]"
    >
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCompose(false)}
            disabled={submitting}
            aria-label="Back to workspace"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <h1 id="compose-title" className="text-sm font-semibold text-zinc-900">
            Compose campaign
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <label
            htmlFor="lead-file"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Upload size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Import CSV / TXT</span>
            <span className="sm:hidden">Import</span>
          </label>
          <input
            id="lead-file"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadLeads(file);
              event.currentTarget.value = '';
            }}
          />

          <button
            form="compose-form"
            type="submit"
            disabled={submitting || !senders.length || !startTimeIsValid}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0f766e] px-4 text-xs font-medium text-white hover:bg-[#115e59] disabled:opacity-55"
          >
            {submitting && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
            <span>{submitting ? 'Scheduling…' : 'Schedule campaign'}</span>
          </button>
        </div>
      </header>

      <form
        id="compose-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="mx-auto my-6 max-w-3xl px-4 pb-10 sm:px-6"
      >
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-200">
            <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">From</span>
              <select
                value={senderId}
                onChange={(event) => {
                  const nextSender = senders.find((sender) => sender.id === event.target.value);
                  setSenderId(event.target.value);
                  if (nextSender) {
                    setDelaySeconds(Math.ceil(nextSender.minimumDelayMs / 1000));
                    setHourlyLimit(nextSender.maxEmailsPerHour);
                  }
                }}
                required
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-[#0f766e] focus:bg-white focus:outline-none"
              >
                {senders.map((sender) => (
                  <option key={sender.id} value={sender.id}>
                    {sender.name} ({sender.from})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">Campaign</span>
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                maxLength={120}
                className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                placeholder="Optional campaign label"
              />
            </label>

            <div className="flex items-start gap-4 px-5 py-3 text-sm">
              <label
                htmlFor="recipients"
                className="w-20 shrink-0 pt-1 text-xs font-medium text-zinc-500"
              >
                To
              </label>
              <div className="min-w-0 flex-1">
                {parsedEmails.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {parsedEmails.slice(0, 10).map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs text-zinc-700"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          aria-label={`Remove ${email}`}
                          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800"
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    {parsedEmails.length > 10 && (
                      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 tabular-nums">
                        +{parsedEmails.length - 10} more
                      </span>
                    )}
                  </div>
                )}

                <textarea
                  id="recipients"
                  value={addresses}
                  onChange={(event) => setAddresses(event.target.value)}
                  rows={Math.min(4, Math.max(2, Math.ceil(parsedEmails.length / 6)))}
                  className="w-full resize-none border-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  placeholder="Paste comma- or newline-separated emails, or import a CSV / TXT file"
                />

                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-mono tabular-nums">
                    {parsedEmails.length} unique recipient{parsedEmails.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
                maxLength={255}
                className="w-full bg-transparent text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none"
                placeholder="Write a clear subject line"
              />
            </label>

            <div className="bg-zinc-50/70 px-5 py-3.5">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium text-zinc-600">
                  Start time
                  <input
                    type="datetime-local"
                    min={minimumStartTime}
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    required
                    className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:border-[#0f766e] focus:outline-none"
                  />
                </label>

                <label className="block text-xs font-medium text-zinc-600">
                  Delay between sends (sec)
                  <input
                    type="number"
                    value={delaySeconds}
                    min={Math.ceil(senderMinimumDelayMs / 1000)}
                    step={1}
                    onChange={(event) => setDelaySeconds(Number(event.target.value))}
                    required
                    className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 tabular-nums focus:border-[#0f766e] focus:outline-none"
                  />
                </label>

                <label className="block text-xs font-medium text-zinc-600">
                  Hourly cap (max {senderHourlyLimit})
                  <input
                    type="number"
                    value={hourlyLimit}
                    min={1}
                    max={senderHourlyLimit}
                    onChange={(event) => setHourlyLimit(Number(event.target.value))}
                    required
                    className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 tabular-nums focus:border-[#0f766e] focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-zinc-500 tabular-nums">
                <span>
                  {startTimeIsValid
                    ? `Starts ${formatDate(scheduledDate.toISOString())}`
                    : 'Choose a date and time in the future'}
                </span>
                {parsedEmails.length > 0 && (
                  <span>
                    Est. duration: {formatDurationEstimate(parsedEmails.length, delaySeconds)}{' '}
                    across {parsedEmails.length}{' '}
                    {parsedEmails.length === 1 ? 'recipient' : 'recipients'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 p-5">
            <label htmlFor="email-body" className="sr-only">
              Email body
            </label>
            <textarea
              id="email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              className="min-h-[340px] w-full resize-y bg-transparent text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              placeholder="Write your email message…"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <AlertBanner tone="error">{error}</AlertBanner>
          </div>
        )}
      </form>
    </section>
  );
}
