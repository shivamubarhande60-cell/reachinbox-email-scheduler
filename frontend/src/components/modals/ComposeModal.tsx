import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Clock3, LoaderCircle, Paperclip, UploadCloud } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { campaignApi } from '../../services/campaignApi';
import { useDashboard } from '../../state/DashboardContext';
import { formatDate, toLocalDateTimeInput } from '../../utils/date';
import { parseAddresses } from '../../utils/email';

/**
 * Full-screen composer for creating and scheduling an email campaign.
 */
export function ComposeModal() {
  const { senders, maxHourlyLimit, minimumDelayMs, setShowCompose, setMessage, loadDashboard } =
    useDashboard();

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
  const [showSchedule, setShowSchedule] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsedEmails = useMemo(() => parseAddresses(addresses), [addresses]);
  const scheduledDate = new Date(startTime);
  const startTimeIsValid = !Number.isNaN(scheduledDate.getTime()) && startTime >= minimumStartTime;

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
      setError('Add at least one valid email address or upload a leads file.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await campaignApi.scheduleCampaign(
        {
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
      setMessage('Your emails are scheduled. You can follow their status here.');
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
      className="compose-shell fixed inset-0 z-40 overflow-y-auto bg-white"
    >
      <header className="compose-toolbar sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCompose(false)}
            aria-label="Back to inbox"
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </button>
          <h1 id="compose-title" className="text-base font-medium text-slate-800">
            Compose New Email
          </h1>
        </div>
        <div className="compose-header-actions flex items-center gap-2">
          <label
            htmlFor="lead-file"
            title="Upload recipient list"
            className="cursor-pointer rounded-md p-2 text-emerald-600 hover:bg-emerald-50"
          >
            <Paperclip size={18} />
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
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            aria-expanded={showSchedule}
            aria-label="Choose send time"
            className="rounded-md p-2 text-emerald-600 hover:bg-emerald-50"
          >
            <Clock3 size={18} />
          </button>
          <button
            form="compose-form"
            type="submit"
            disabled={submitting || !senders.length || !startTimeIsValid}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            {submitting ? <LoaderCircle className="animate-spin" size={15} /> : null}
            {submitting ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>

        {showSchedule && (
          <div className="absolute right-5 top-14 z-20 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:right-10">
            <p className="mb-2 text-sm font-medium text-slate-800">Send later</p>
            <label className="block text-xs text-slate-500">
              Pick a date &amp; time
              <input
                type="datetime-local"
                min={minimumStartTime}
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="form-input mt-2"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              className="float-right mt-4 rounded-full border border-emerald-500 px-4 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Done
            </button>
          </div>
        )}
      </header>

      <form
        id="compose-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="compose-form mx-auto max-w-4xl px-5 pb-10 sm:px-10"
      >
        <label className="flex min-h-14 items-center gap-3 border-b border-slate-100 text-sm">
          <span className="w-10 shrink-0 text-slate-600">From</span>
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
            className="max-w-full rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
          >
            {senders.map((sender) => (
              <option key={sender.id} value={sender.id}>
                {sender.name} · {sender.from}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3 border-b border-slate-100 py-3 text-sm">
          <label htmlFor="recipients" className="w-10 shrink-0 pt-1 text-slate-600">
            To
          </label>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {parsedEmails.slice(0, 8).map((email) => (
                <span
                  key={email}
                  className="rounded-full border border-emerald-400 bg-emerald-50 px-2.5 py-1 text-xs text-slate-700"
                >
                  {email}
                </span>
              ))}
              {parsedEmails.length > 8 && (
                <span className="rounded-full border border-emerald-400 px-2.5 py-1 text-xs text-slate-600">
                  +{parsedEmails.length - 8}
                </span>
              )}
            </div>
            <textarea
              id="recipients"
              value={addresses}
              onChange={(event) => setAddresses(event.target.value)}
              rows={Math.min(3, Math.max(1, Math.ceil(parsedEmails.length / 8)))}
              className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Enter email addresses or upload a list"
            />
            <p className="text-[11px] text-slate-400">
              {parsedEmails.length} unique address{parsedEmails.length === 1 ? '' : 'es'}
            </p>
          </div>
          <label
            htmlFor="lead-file"
            className="hidden cursor-pointer items-center gap-1 self-start pt-1 text-xs text-emerald-600 hover:text-emerald-700 sm:flex"
          >
            <UploadCloud size={15} /> Upload List
          </label>
        </div>

        <label className="flex min-h-12 items-center gap-3 border-b border-slate-100 text-sm">
          <span className="w-10 shrink-0 text-slate-600">Subject</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            maxLength={255}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Subject"
          />
        </label>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 py-3 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            Delay between emails
            <input
              type="number"
              value={delaySeconds}
              min={Math.ceil(senderMinimumDelayMs / 1000)}
              step={1}
              onChange={(event) => setDelaySeconds(Number(event.target.value))}
              required
              className="w-14 rounded-md border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-emerald-400"
            />
            sec
          </label>
          <label className="flex items-center gap-2">
            Hourly Limit
            <input
              type="number"
              value={hourlyLimit}
              min={1}
              max={senderHourlyLimit}
              onChange={(event) => setHourlyLimit(Number(event.target.value))}
              required
              className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-emerald-400"
            />
          </label>
          <span className="text-slate-400">Up to {senderHourlyLimit} per sender / hour</span>
        </div>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          className="mt-5 min-h-[48vh] w-full resize-y rounded-lg bg-[#fafafa] p-5 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-100"
          placeholder="Type Your Reply..."
        />

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <p className="mt-2 text-right text-xs text-slate-400">
          {startTimeIsValid
            ? `Scheduled for ${formatDate(scheduledDate.toISOString())}`
            : 'Choose a date and time in the future'}
        </p>
      </form>
    </section>
  );
}
