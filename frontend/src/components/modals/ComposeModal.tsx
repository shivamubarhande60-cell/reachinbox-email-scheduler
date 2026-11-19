import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { ArrowLeft, CalendarClock, LoaderCircle, Mail, Upload, X } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { campaignApi } from '../../services/campaignApi';
import { useDashboard } from '../../state/useDashboard';
import { useToast } from '../../state/useToast';
import { formatDate, toLocalDateTimeInput } from '../../utils/date';
import { parseAddresses } from '../../utils/email';
import { AlertBanner } from '../common/AlertBanner';

interface QuickTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'product-update',
    label: 'Product update',
    subject: 'What shipped in our latest release',
    body: 'Hi there,\n\nWe just rolled out faster scheduling controls and real-time delivery diagnostics across your workspace.\n\nReply directly to this email if you would like a quick walkthrough.\n\nBest,\nThe ReachInbox Team',
  },
  {
    id: 'follow-up',
    label: 'Customer follow-up',
    subject: 'Quick check-in on your rollout',
    body: 'Hi,\n\nWanted to check how your team is settling in with the new sending limits and queue pacing.\n\nLet me know if any sender needs a higher hourly allowance.\n\nThanks,',
  },
  {
    id: 'onboarding',
    label: 'Onboarding check-in',
    subject: 'Three steps to verify your first SMTP sender',
    body: 'Welcome aboard,\n\n1. Open SMTP senders and verify your host credentials.\n2. Import your recipient list via CSV or plain text.\n3. Choose a send gap and launch your first paced campaign.\n\nHappy sending,',
  },
];

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

function formatTimeShort(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * Split-pane editorial composer with drag-and-drop CSV import, quick templates, and live pacing projection.
 */
export function ComposeModal() {
  const { senders, maxHourlyLimit, minimumDelayMs, setShowCompose, setMessage, loadDashboard } =
    useDashboard();
  const { pushToast } = useToast();

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderId, setSenderId] = useState(senders[0]?.id || '');
  const selectedSender = senders.find((sender) => sender.id === senderId);
  const [addresses, setAddresses] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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
  const scheduledDate = useMemo(() => new Date(startTime), [startTime]);
  const startTimeIsValid = !Number.isNaN(scheduledDate.getTime()) && startTime >= minimumStartTime;

  const projectedSlots = useMemo(() => {
    if (!startTimeIsValid || parsedEmails.length === 0) return [];
    const baseMs = scheduledDate.getTime();
    const safeDelayMs = Math.max(0, delaySeconds) * 1000;
    return parsedEmails.slice(0, 5).map((email, idx) => ({
      email,
      at: new Date(baseMs + idx * safeDelayMs),
    }));
  }, [parsedEmails, startTimeIsValid, scheduledDate, delaySeconds]);

  const spansMultipleHours = parsedEmails.length > Math.max(1, hourlyLimit);

  const removeRecipient = (emailToRemove: string) => {
    const nextEmails = parsedEmails.filter((email) => email !== emailToRemove);
    setAddresses(nextEmails.join(', '));
  };

  const loadLeads = async (file: File) => {
    try {
      const content = await file.text();
      setAddresses(content);
      setError('');
      const count = parseAddresses(content).length;
      pushToast({
        title: `Imported ${count} recipient${count === 1 ? '' : 's'}`,
        description: file.name,
        tone: 'info',
      });
    } catch {
      setError('Could not read that file. Try a CSV or plain text file.');
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadLeads(file);
  };

  const applyTemplate = (template: QuickTemplate) => {
    setSubject(template.subject);
    setBody(template.body);
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
      pushToast({
        title: `Scheduled ${parsedEmails.length} email${parsedEmails.length === 1 ? '' : 's'}`,
        description: campaignName.trim() || subject.trim(),
        tone: 'success',
      });
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
      className="fixed inset-0 z-40 overflow-y-auto bg-[#fafafa] dark:bg-[#09090b]"
    >
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8 dark:border-zinc-800 dark:bg-[#09090b]/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCompose(false)}
            disabled={submitting}
            aria-label="Back to workspace"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <h1 id="compose-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Compose campaign
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <label
            htmlFor="lead-file"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0f766e] px-4 text-xs font-medium text-white hover:bg-[#115e59] disabled:opacity-55 dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
          >
            {submitting && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
            <span>{submitting ? 'Scheduling…' : 'Schedule campaign'}</span>
          </button>
        </div>
      </header>

      <form
        id="compose-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="mx-auto my-6 max-w-6xl px-4 pb-12 sm:px-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    From
                  </span>
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
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-[#0f766e] focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {senders.map((sender) => (
                      <option key={sender.id} value={sender.id}>
                        {sender.name} ({sender.from})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Campaign
                  </span>
                  <input
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    maxLength={120}
                    className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                    placeholder="Optional campaign label"
                  />
                </label>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDrop}
                  className={`flex items-start gap-4 px-5 py-3 text-sm transition-colors ${
                    isDraggingFile
                      ? 'bg-[#0f766e]/5 dark:bg-[#14b8a6]/10'
                      : 'bg-transparent'
                  }`}
                >
                  <label
                    htmlFor="recipients"
                    className="w-20 shrink-0 pt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    To
                  </label>
                  <div className="min-w-0 flex-1">
                    {parsedEmails.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {parsedEmails.slice(0, 10).map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          >
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeRecipient(email)}
                              aria-label={`Remove ${email}`}
                              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            >
                              <X size={11} aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                        {parsedEmails.length > 10 && (
                          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 tabular-nums dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
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
                      className="w-full resize-none border-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                      placeholder="Paste emails, or drop a .csv / .txt file here"
                    />

                    <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono tabular-nums">
                        {parsedEmails.length} unique recipient{parsedEmails.length === 1 ? '' : 's'}
                      </span>
                      {isDraggingFile && (
                        <span className="font-medium text-[#0f766e] dark:text-[#14b8a6]">
                          Drop file to import recipients
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label className="flex min-h-12 items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Subject
                  </span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    required
                    maxLength={255}
                    className="w-full bg-transparent text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                    placeholder="Write a clear subject line"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2 bg-zinc-50/70 px-5 py-2.5 dark:bg-zinc-900/50">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Templates:
                  </span>
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  <label htmlFor="email-body" className="sr-only">
                    Email body
                  </label>
                  <textarea
                    id="email-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    required
                    className="min-h-[260px] w-full resize-y bg-transparent text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                    placeholder="Write your email message…"
                  />
                </div>

                <div className="bg-zinc-50/70 px-5 py-4 dark:bg-zinc-900/50">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Start time
                      <input
                        type="datetime-local"
                        min={minimumStartTime}
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                        className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:border-[#0f766e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Delay between sends (sec)
                      <input
                        type="number"
                        value={delaySeconds}
                        min={Math.ceil(senderMinimumDelayMs / 1000)}
                        step={1}
                        onChange={(event) => setDelaySeconds(Number(event.target.value))}
                        required
                        className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 tabular-nums focus:border-[#0f766e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Hourly cap (max {senderHourlyLimit})
                      <input
                        type="number"
                        value={hourlyLimit}
                        min={1}
                        max={senderHourlyLimit}
                        onChange={(event) => setHourlyLimit(Number(event.target.value))}
                        required
                        className="mt-1.5 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 tabular-nums focus:border-[#0f766e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {error && <AlertBanner tone="error">{error}</AlertBanner>}
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Mail size={13} aria-hidden="true" />
                  <span>Inbox preview</span>
                </span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  {parsedEmails.length} recipient{parsedEmails.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3 p-4 text-sm">
                <div className="space-y-1 border-b border-zinc-200 pb-3 text-xs dark:border-zinc-800">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    From:{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedSender ? `${selectedSender.name} <${selectedSender.from}>` : 'No sender'}
                    </span>
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    To:{' '}
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {parsedEmails[0] || 'recipient@example.com'}
                    </span>
                    {parsedEmails.length > 1 && (
                      <span className="ml-1 text-zinc-400">+{parsedEmails.length - 1} others</span>
                    )}
                  </p>
                  <p className="pt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {subject.trim() || 'Subject line preview'}
                  </p>
                </div>

                <div className="min-h-[150px] whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {body.trim() || 'Your formatted email body appears here as you type.'}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <CalendarClock size={13} aria-hidden="true" />
                  <span>Projected dispatch schedule</span>
                </span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  {parsedEmails.length > 0
                    ? formatDurationEstimate(parsedEmails.length, delaySeconds)
                    : '—'}
                </span>
              </div>

              <div className="p-4">
                {!startTimeIsValid ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Choose a valid future start date and time.
                  </p>
                ) : projectedSlots.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Add recipients to calculate per-lead BullMQ dispatch timestamps.
                  </p>
                ) : (
                  <>
                    <p className="mb-3 font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                      Starts {formatDate(scheduledDate.toISOString())}
                    </p>
                    <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {projectedSlots.map((slot, index) => (
                        <div
                          key={slot.email}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                        >
                          <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
                            {index + 1}. {slot.email}
                          </span>
                          <span className="shrink-0 font-mono text-zinc-500 tabular-nums dark:text-zinc-400">
                            {formatTimeShort(slot.at)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {parsedEmails.length > 5 && (
                      <p className="mt-2 font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                        +{parsedEmails.length - 5} more queued at {delaySeconds}s intervals
                      </p>
                    )}
                    {spansMultipleHours && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        Batch size ({parsedEmails.length}) exceeds hourly cap ({hourlyLimit}/hr).
                        Excess emails will roll over automatically at the next UTC hour boundary.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}
