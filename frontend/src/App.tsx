import { useCallback, useEffect, useMemo, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogOut,
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Send,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface User {
  id: number;
  name: string;
  email: string;
  picture: string | null;
  isDemo: boolean;
  slackConnected: boolean;
  slackConfigured: boolean;
}

interface Lead {
  id: number;
  email: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  senderId: string;
  createdAt: string;
  leads: Lead[];
}

interface Sender {
  id: string;
  name: string;
  from: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
  managed: boolean;
}

type EmailRow = Lead & Pick<Campaign, 'subject' | 'name' | 'senderId'>;
type DashboardTab = 'scheduled' | 'sent';
type DashboardSection = 'activity' | 'campaigns' | 'campaign' | 'attention';

function parseAddresses(value: string) {
  return [...new Set(
    (value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
      .map((email) => email.toLowerCase()),
  )];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toLocalDateTimeInput(value: Date) {
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function updateLandingPointer(event: ReactPointerEvent<HTMLElement>, reset = false) {
  if (event.pointerType === 'touch' && !reset) return;

  const page = event.currentTarget;
  const pageBounds = page.getBoundingClientRect();
  const x = reset ? 50 : ((event.clientX - pageBounds.left) / Math.max(pageBounds.width, 1)) * 100;
  const y = reset ? 50 : ((event.clientY - pageBounds.top) / Math.max(pageBounds.height, 1)) * 100;
  page.style.setProperty('--pointer-x', `${x}%`);
  page.style.setProperty('--pointer-y', `${y}%`);

  const preview = page.querySelector<HTMLElement>('.login-preview');
  if (!preview) return;
  const previewBounds = preview.getBoundingClientRect();
  const previewX = reset ? 80 : Math.min(100, Math.max(0, ((event.clientX - previewBounds.left) / Math.max(previewBounds.width, 1)) * 100));
  const previewY = reset ? 15 : Math.min(100, Math.max(0, ((event.clientY - previewBounds.top) / Math.max(previewBounds.height, 1)) * 100));
  preview.style.setProperty('--panel-pointer-x', `${previewX}%`);
  preview.style.setProperty('--panel-pointer-y', `${previewY}%`);
  const shiftX = reset ? 0 : ((x - 50) / 50) * 22;
  const shiftY = reset ? 0 : ((y - 50) / 50) * 22;
  preview.style.setProperty('--panel-shift-x', `${shiftX}px`);
  preview.style.setProperty('--panel-shift-y', `${shiftY}px`);
  preview.style.setProperty('--panel-shift-x-reverse', `${-shiftX}px`);
  preview.style.setProperty('--panel-shift-y-reverse', `${-shiftY}px`);
}

function StatusLabel({ status }: { status: string }) {
  const isSent = status === 'SENT';
  const isFailed = status === 'FAILED';
  const label = isSent ? 'Sent' : isFailed ? 'Failed' : status === 'THROTTLED_DELAYED' ? 'Queued for later' : 'Scheduled';
  const color = isSent
    ? 'bg-emerald-50 text-emerald-700'
    : isFailed
      ? 'bg-rose-50 text-rose-700'
      : 'bg-amber-50 text-amber-700';

  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${isSent ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'}`} />
    {label}
  </span>;
}

function LoginScreen({
  error,
  demoEnabled,
  onDemoLogin,
  demoLoading,
}: {
  error: string;
  demoEnabled: boolean;
  onDemoLogin: () => void;
  demoLoading: boolean;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <main
        className="login-shell flex min-h-screen items-center justify-center px-5 py-10"
        onPointerMove={(event) => updateLandingPointer(event)}
        onPointerLeave={(event) => updateLandingPointer(event, true)}
      >
        <motion.div
          className="login-layout"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        >
        <section className="login-card">
          <a href="/" className="login-brand">
            <span className="login-brand-mark"><Send size={17} /></span>
            ReachInbox
          </a>
          <div className="login-copy">
            <p className="eyebrow">EMAIL WORKSPACE</p>
            <h1>Good to see you.</h1>
            <p>Sign in to keep your email schedule moving.</p>
          </div>
          {error && <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <a className="google-login-button" href={`${apiUrl}/auth/google`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">G</span>
            Continue with Google
          </a>
          {demoEnabled && <div className="demo-login">
            <button type="button" onClick={onDemoLogin} disabled={demoLoading}>
              {demoLoading ? 'Opening preview...' : 'Open local preview'}
            </button>
            <p>Local-only preview. Google sign-in is unchanged.</p>
          </div>}
          <p className="login-footnote">Your workspace is private to your account.</p>
        </section>

        <motion.aside
          className="login-preview"
          aria-label="Scheduler overview"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="fluid-scene" aria-hidden="true">
            <span className="fluid-orb fluid-orb-one" />
            <span className="fluid-orb fluid-orb-two" />
            <span className="fluid-ring" />
          </div>
          <p className="preview-kicker"><span /> SCHEDULER OVERVIEW</p>
          <h2>Good outreach starts with good timing.</h2>
          <p className="preview-description">Keep every message organized, paced, and easy to follow.</p>
          <motion.div
            className="preview-flow"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } } }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
              <span className="flow-icon"><Clock3 size={16} /></span><span><strong>Schedule</strong><small>Choose when a campaign begins</small></span><b>01</b>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
              <span className="flow-icon"><Mail size={16} /></span><span><strong>Send steadily</strong><small>Respect your sender's limits</small></span><b>02</b>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
              <span className="flow-icon"><CheckCircle2 size={16} /></span><span><strong>Track progress</strong><small>See scheduled and sent emails</small></span><b>03</b>
            </motion.div>
          </motion.div>
          <p className="preview-note">A simple workspace for reliable email scheduling.</p>
          <p className="tech-stack-note">TypeScript · Express · BullMQ · Redis · MySQL · React</p>
        </motion.aside>
        </motion.div>
      </main>
    </MotionConfig>
  );
}

function SenderManagement({
  senders,
  maxHourlyLimit,
  minimumDelayMs,
  onClose,
  onChanged,
}: {
  senders: Sender[];
  maxHourlyLimit: number;
  minimumDelayMs: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [host, setHost] = useState('smtp.ethereal.email');
  const [port, setPort] = useState('587');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(maxHourlyLimit);
  const [delaySeconds, setDelaySeconds] = useState(Math.ceil(minimumDelayMs / 1000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/senders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          from,
          host,
          port: Number(port),
          username,
          password,
          maxEmailsPerHour: hourlyLimit,
          minimumDelayMs: delaySeconds * 1000,
        }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Could not connect this sender.');
      setPassword('');
      setNotice('SMTP connection verified and sender added.');
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect this sender.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sender: Sender) => {
    if (!sender.managed) return;
    if (!window.confirm(`Remove ${sender.name}? Scheduled emails using this sender must finish first.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/senders/${encodeURIComponent(sender.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Could not remove this sender.');
      setNotice(`${sender.name} was removed.`);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this sender.');
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="senders-title" className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">SMTP SETTINGS</p>
            <h2 id="senders-title" className="mt-1 text-lg font-semibold text-slate-900">Manage senders</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close sender management" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1.1fr]">
          <section aria-labelledby="configured-senders-title">
            <h3 id="configured-senders-title" className="text-sm font-semibold text-slate-800">Configured senders <span className="text-slate-400">({senders.length})</span></h3>
            <div className="mt-3 space-y-2">
              {senders.length ? senders.map((sender) => (
                <div key={sender.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Send size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{sender.name}</p>
                    <p className="truncate text-xs text-slate-500">{sender.from}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{sender.maxEmailsPerHour}/hour · {Math.ceil(sender.minimumDelayMs / 1000)} sec minimum gap</p>
                    {!sender.managed && <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Environment configured</span>}
                  </div>
                  {sender.managed && <button type="button" onClick={() => void remove(sender)} disabled={busy} title={`Remove ${sender.name}`} aria-label={`Remove ${sender.name}`} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={15} /></button>}
                </div>
              )) : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500">No senders connected yet.</p>}
            </div>
          </section>

          <form onSubmit={(event) => void submit(event)} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Connect a sender</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">SMTP credentials are verified before saving and encrypted in the database.</p>
            </div>
            <label className="block text-xs font-medium text-slate-600">Sender name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className={fieldClass} placeholder="Ethereal sender" /></label>
            <label className="block text-xs font-medium text-slate-600">Sender email<input type="email" value={from} onChange={(event) => setFrom(event.target.value)} required maxLength={320} className={fieldClass} placeholder="you@example.com" /></label>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <label className="block text-xs font-medium text-slate-600">SMTP host<input value={host} onChange={(event) => setHost(event.target.value)} required maxLength={255} className={fieldClass} placeholder="smtp.example.com" /></label>
              <label className="block text-xs font-medium text-slate-600">Port<input type="number" value={port} onChange={(event) => setPort(event.target.value)} required min={1} max={65535} className={fieldClass} /></label>
            </div>
            <label className="block text-xs font-medium text-slate-600">SMTP username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={255} className={fieldClass} /></label>
            <label className="block text-xs font-medium text-slate-600">SMTP password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={4096} className={fieldClass} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-600">Emails per hour<input type="number" value={hourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} required min={1} max={maxHourlyLimit} className={fieldClass} /><span className="mt-1 block text-[10px] font-normal text-slate-400">Maximum {maxHourlyLimit}</span></label>
              <label className="block text-xs font-medium text-slate-600">Minimum delay (sec)<input type="number" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))} required min={Math.ceil(minimumDelayMs / 1000)} step={1} className={fieldClass} /><span className="mt-1 block text-[10px] font-normal text-slate-400">Minimum {Math.ceil(minimumDelayMs / 1000)} sec</span></label>
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={16} />}
              {busy ? 'Saving sender…' : 'Verify and add sender'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ComposePage({
  senders,
  maxHourlyLimit,
  minimumDelayMs,
  onClose,
  onScheduled,
}: {
  senders: Sender[];
  maxHourlyLimit: number;
  minimumDelayMs: number;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderId, setSenderId] = useState(senders[0]?.id || '');
  const selectedSender = senders.find((sender) => sender.id === senderId);
  const [addresses, setAddresses] = useState('');
  const [startTime, setStartTime] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 5 * 60000)));
  const [minimumStartTime] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60000)));
  const [delaySeconds, setDelaySeconds] = useState(Math.ceil((senders[0]?.minimumDelayMs ?? minimumDelayMs) / 1000));
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
      const response = await fetch(`${apiUrl}/api/campaigns/schedule`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          subject,
          body,
          emails: parsedEmails,
          senderId,
          startTime: scheduledDate.toISOString(),
          delayMs: delaySeconds * 1000,
          hourlyLimit,
        }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Could not schedule these emails.');
      setIdempotencyKey(crypto.randomUUID());
      onScheduled();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not schedule these emails.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="compose-title" className="compose-shell fixed inset-0 z-40 overflow-y-auto bg-white">
      <header className="compose-toolbar sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Back to inbox" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
            <ArrowLeft size={19} />
          </button>
          <h1 id="compose-title" className="text-base font-medium text-slate-800">Compose New Email</h1>
        </div>
        <div className="compose-header-actions flex items-center gap-2">
          <label htmlFor="lead-file" title="Upload recipient list" className="cursor-pointer rounded-md p-2 text-emerald-600 hover:bg-emerald-50">
            <Paperclip size={18} />
          </label>
          <input id="lead-file" type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadLeads(file);
            event.currentTarget.value = '';
          }} />
          <button type="button" onClick={() => setShowSchedule(!showSchedule)} aria-expanded={showSchedule} aria-label="Choose send time" className="rounded-md p-2 text-emerald-600 hover:bg-emerald-50">
            <Clock3 size={18} />
          </button>
          <button form="compose-form" type="submit" disabled={submitting || !senders.length || !startTimeIsValid} className="inline-flex items-center gap-2 rounded-full border border-emerald-500 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
            {submitting ? <LoaderCircle className="animate-spin" size={15} /> : null}
            {submitting ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
        {showSchedule && <div className="absolute right-5 top-14 z-20 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:right-10">
          <p className="mb-2 text-sm font-medium text-slate-800">Send later</p>
          <label className="block text-xs text-slate-500">
            Pick a date &amp; time
            <input type="datetime-local" min={minimumStartTime} value={startTime} onChange={(event) => setStartTime(event.target.value)} className="form-input mt-2" />
          </label>
          <button type="button" onClick={() => setShowSchedule(false)} className="mt-4 float-right rounded-full border border-emerald-500 px-4 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Done</button>
        </div>}
      </header>

      <form id="compose-form" onSubmit={submit} className="compose-form mx-auto max-w-4xl px-5 pb-10 sm:px-10">
        <label className="flex min-h-14 items-center gap-3 border-b border-slate-100 text-sm">
          <span className="w-10 shrink-0 text-slate-600">From</span>
          <select value={senderId} onChange={(event) => {
            const nextSender = senders.find((sender) => sender.id === event.target.value);
            setSenderId(event.target.value);
            if (nextSender) {
              setDelaySeconds(Math.ceil(nextSender.minimumDelayMs / 1000));
              setHourlyLimit(nextSender.maxEmailsPerHour);
            }
          }} required className="max-w-full rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none">
            {senders.map((sender) => <option key={sender.id} value={sender.id}>{sender.name} · {sender.from}</option>)}
          </select>
        </label>
        <div className="flex gap-3 border-b border-slate-100 py-3 text-sm">
          <label htmlFor="recipients" className="w-10 shrink-0 pt-1 text-slate-600">To</label>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {parsedEmails.slice(0, 8).map((email) => <span key={email} className="rounded-full border border-emerald-400 bg-emerald-50 px-2.5 py-1 text-xs text-slate-700">{email}</span>)}
              {parsedEmails.length > 8 && <span className="rounded-full border border-emerald-400 px-2.5 py-1 text-xs text-slate-600">+{parsedEmails.length - 8}</span>}
            </div>
            <textarea id="recipients" value={addresses} onChange={(event) => setAddresses(event.target.value)} rows={Math.min(3, Math.max(1, Math.ceil(parsedEmails.length / 8)))} className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Enter email addresses or upload a list" />
            <p className="text-[11px] text-slate-400">{parsedEmails.length} unique address{parsedEmails.length === 1 ? '' : 'es'}</p>
          </div>
          <label htmlFor="lead-file" className="hidden cursor-pointer items-center gap-1 self-start pt-1 text-xs text-emerald-600 hover:text-emerald-700 sm:flex"><UploadCloud size={15} /> Upload List</label>
        </div>
        <label className="flex min-h-12 items-center gap-3 border-b border-slate-100 text-sm">
          <span className="w-10 shrink-0 text-slate-600">Subject</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={255} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Subject" />
        </label>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 py-3 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            Delay between emails
            <input type="number" value={delaySeconds} min={Math.ceil(senderMinimumDelayMs / 1000)} step={1} onChange={(event) => setDelaySeconds(Number(event.target.value))} required className="w-14 rounded-md border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-emerald-400" />
            sec
          </label>
          <label className="flex items-center gap-2">
            Hourly Limit
            <input type="number" value={hourlyLimit} min={1} max={senderHourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} required className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-emerald-400" />
          </label>
          <span className="text-slate-400">Up to {senderHourlyLimit} per sender / hour</span>
        </div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required className="mt-5 min-h-[48vh] w-full resize-y rounded-lg bg-[#fafafa] p-5 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-100" placeholder="Type Your Reply..." />
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <p className="mt-2 text-right text-xs text-slate-400">
          {startTimeIsValid
            ? `Scheduled for ${formatDate(scheduledDate.toISOString())}`
            : 'Choose a date and time in the future'}
        </p>
      </form>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [maxHourlyLimit, setMaxHourlyLimit] = useState(200);
  const [minimumDelayMs, setMinimumDelayMs] = useState(2000);
  const [activeTab, setActiveTab] = useState<DashboardTab>('scheduled');
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('activity');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [searchRefreshVersion, setSearchRefreshVersion] = useState(0);
  const [searchResult, setSearchResult] = useState<{ query: string; rows: EmailRow[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityStatus, setActivityStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [showCompose, setShowCompose] = useState(false);
  const [showSenders, setShowSenders] = useState(false);
  const [message, setMessage] = useState(() =>
    new URLSearchParams(window.location.search).get('slack') === 'connected'
      ? 'Slack is connected. Rate-limit alerts will be sent to your account.'
      : '',
  );
  const [error, setError] = useState('');
  const [slackBusy, setSlackBusy] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' });
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error('Could not check your sign-in status.');
      const result = await response.json() as { data: User };
      setUser(result.data);
      setAuthError('');
    } catch {
      setAuthError('Could not reach the scheduler. Start the backend and try again.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (quiet = false, announceRefresh = false) => {
    if (!quiet) setLoading(true);
    try {
      const [campaignResponse, senderResponse] = await Promise.all([
        fetch(`${apiUrl}/api/campaigns`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/senders`, { credentials: 'include' }),
      ]);
      if (campaignResponse.status === 401) {
        setUser(null);
        return;
      }
      const campaignResult = await campaignResponse.json() as { data?: Campaign[]; message?: string };
      const senderResult = await senderResponse.json() as {
        data?: Sender[];
        maxEmailsPerHour?: number;
        minimumDelayMs?: number;
        message?: string;
      };
      if (!campaignResponse.ok) throw new Error(campaignResult.message || 'Could not load emails.');
      if (!senderResponse.ok) throw new Error(senderResult.message || 'Could not load senders.');
      setCampaigns(campaignResult.data || []);
      setSenders(senderResult.data || []);
      setMaxHourlyLimit(senderResult.maxEmailsPerHour || 200);
      setMinimumDelayMs(senderResult.minimumDelayMs || 2000);
      setActivityStatus('live');
      setError('');
      if (announceRefresh) setMessage('Email list refreshed.');
    } catch (cause) {
      setActivityStatus('offline');
      setError(cause instanceof Error ? cause.message : 'Could not load your emails.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
    void fetch(`${apiUrl}/api/auth/demo-status`)
      .then((response) => response.json() as Promise<{ enabled?: boolean }>)
      .then((result) => setDemoEnabled(result.enabled === true))
      .catch(() => setDemoEnabled(false));
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(true), 5000);
    return () => window.clearInterval(timer);
  }, [user, loadDashboard]);

  useEffect(() => {
    const query = search.trim();
    if (!user || !query) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/emails/search?q=${encodeURIComponent(query)}`,
          { credentials: 'include', signal: controller.signal },
        );
        const result = await response.json() as { data?: EmailRow[]; message?: string };
        if (!response.ok) throw new Error(result.message || 'Search failed.');
        setSearchResult({ query, rows: result.data || [] });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Search failed.');
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [user, search, searchRefreshVersion]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('slack') === 'connected') {
      void loadUser();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadUser]);

  const rows = useMemo<EmailRow[]>(() => campaigns.flatMap((campaign) =>
    campaign.leads.map((lead) => ({
      ...lead,
      subject: campaign.subject,
      name: campaign.name,
      senderId: campaign.senderId,
    })),
  ), [campaigns]);
  const scheduled = rows.filter((row) => row.status === 'PENDING' || row.status === 'THROTTLED_DELAYED');
  const sent = rows.filter((row) => row.status === 'SENT' || row.status === 'FAILED');
  const delivered = sent.filter((row) => row.status === 'SENT').length;
  const failed = sent.filter((row) => row.status === 'FAILED').length;
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;
  const campaignRows = selectedCampaign?.leads.map((lead) => ({
    ...lead,
    subject: selectedCampaign.subject,
    name: selectedCampaign.name,
    senderId: selectedCampaign.senderId,
  })) || [];
  const rowsToShow = dashboardSection === 'attention'
    ? rows.filter((row) => row.status === 'FAILED')
    : dashboardSection === 'campaign'
      ? campaignRows
      : searchResult?.query === search.trim()
        ? searchResult.rows
        : search.trim() ? [] : activeTab === 'scheduled' ? scheduled : sent;
  const visibleRows = dashboardSection === 'attention' || dashboardSection === 'campaign'
    ? rowsToShow
    : search.trim() && searchResult?.query === search.trim()
      ? rowsToShow
      : rowsToShow.filter((row) => activeTab === 'scheduled'
        ? row.status === 'PENDING' || row.status === 'THROTTLED_DELAYED'
        : row.status === 'SENT' || row.status === 'FAILED');

  const showActivity = (tab: DashboardTab) => {
    setDashboardSection('activity');
    setSelectedCampaignId(null);
    setActiveTab(tab);
    setSearch('');
    setSearchRefreshVersion(0);
    setSearchResult(null);
    setSearchLoading(false);
  };

  const showCampaigns = () => {
    setDashboardSection('campaigns');
    setSelectedCampaignId(null);
    setSearch('');
    setSearchRefreshVersion(0);
    setSearchResult(null);
    setSearchLoading(false);
  };

  const showAttention = () => {
    setDashboardSection('attention');
    setSelectedCampaignId(null);
    setActiveTab('sent');
    setSearch('');
    setSearchRefreshVersion(0);
    setSearchResult(null);
    setSearchLoading(false);
  };

  const showCampaign = (campaignId: number) => {
    setDashboardSection('campaign');
    setSelectedCampaignId(campaignId);
    setSearch('');
    setSearchRefreshVersion(0);
    setSearchResult(null);
    setSearchLoading(false);
  };

  const logout = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Could not log out.');
      setUser(null);
      setCampaigns([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log out.');
    }
  };

  const startDemoLogin = async () => {
    setDemoLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${apiUrl}/api/auth/demo`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not open the local preview.');
      await loadUser();
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : 'Could not open the local preview.');
    } finally {
      setDemoLoading(false);
    }
  };

  const disconnectSlack = async () => {
    setSlackBusy(true);
    try {
      const response = await fetch(`${apiUrl}/api/slack`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Could not disconnect Slack.');
      await loadUser();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disconnect Slack.');
    } finally {
      setSlackBusy(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6] text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading your workspace...</div>;
  }
  if (!user) return <LoginScreen
    error={authError}
    demoEnabled={demoEnabled}
    onDemoLogin={() => void startDemoLogin()}
    demoLoading={demoLoading}
  />;

  return (
    <div className="dashboard-shell min-h-screen text-slate-800">
      <aside className="workspace-sidebar fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-100 px-4 py-6 lg:flex">
        <a href="/" className="workspace-brand mb-7 flex items-center gap-2 px-2 text-xl font-bold tracking-tight text-slate-950">
          <span className="workspace-brand-mark"><Send size={15} /></span>
          <span>ReachInbox</span>
        </a>
        <div className="mb-5 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            {user.picture ? <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">{user.name[0]?.toUpperCase()}</span>}
            <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-slate-800">{user.name}</strong><small className="block truncate text-[10px] text-slate-400">{user.email}</small></span>
            <button type="button" onClick={() => void logout()} aria-label="Log out" title="Log out" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut size={14} /></button>
          </div>
        </div>
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Core</p>
        <button type="button" aria-pressed={activeTab === 'scheduled'} onClick={() => setActiveTab('scheduled')} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${activeTab === 'scheduled' ? 'bg-[#e5f7ed] font-medium text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          <span className="flex items-center gap-3"><Clock3 size={16} /> Scheduled</span>
          <span className="text-xs text-slate-400">{scheduled.length}</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'sent'} onClick={() => setActiveTab('sent')} className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${activeTab === 'sent' ? 'bg-[#e5f7ed] font-medium text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          <span className="flex items-center gap-3"><Send size={16} /> Sent</span>
          <span className="text-xs text-slate-400">{sent.length}</span>
        </button>
        <button type="button" aria-pressed={showSenders} onClick={() => setShowSenders(true)} className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${showSenders ? 'bg-[#e5f7ed] font-medium text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          <span className="flex items-center gap-3"><Settings size={16} /> Senders</span>
          <span className="text-xs text-slate-400">{senders.length}</span>
        </button>
        <div className="mt-auto rounded-xl border border-slate-100 bg-white p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Clock3 size={16} className="text-emerald-600" /> Sending limits</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">At least {Math.ceil(minimumDelayMs / 1000)} sec between emails, up to {maxHourlyLimit} per sender each hour.</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="workspace-header sticky top-0 z-20 px-5 pt-5 sm:px-10">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <a href="/" aria-label="ReachInbox home" className="mobile-brand flex shrink-0 items-center gap-2 lg:hidden">
              <span className="workspace-brand-mark"><Send size={14} /></span>
              <span className="hidden sm:inline">ReachInbox</span>
            </a>
            <label className="relative w-full max-w-lg">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input aria-label="Search emails" value={search} onChange={(event) => {
                setDashboardSection('activity');
                setSelectedCampaignId(null);
                setSearch(event.target.value);
                setSearchResult(null);
                setSearchLoading(Boolean(event.target.value.trim()));
              }} placeholder="Search emails" className="w-full rounded-full border-0 bg-[#f4f7f5] py-2.5 pl-9 pr-4 text-sm outline-none ring-1 ring-transparent focus:ring-emerald-200" />
            </label>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setShowSenders(true)} aria-label="Manage senders" title="Manage senders" className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3 lg:hidden">
                <Settings size={15} /> <span className="hidden sm:inline">Senders</span>
              </button>
              {user.slackConnected ? (
                <button type="button" onClick={() => void disconnectSlack()} disabled={slackBusy} aria-label="Disconnect Slack" title="Disconnect Slack" className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3">
                  <MessageCircle size={15} className="text-emerald-600" /> <span className="hidden sm:inline">Slack connected · Disconnect</span>
                </button>
              ) : user.slackConfigured ? (
                <a href={`${apiUrl}/auth/slack`} aria-label="Connect Slack" title="Connect Slack" className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3">
                  <MessageCircle size={15} /> <span className="hidden sm:inline">Connect Slack</span>
                </a>
              ) : (
                <button type="button" disabled aria-label="Slack setup required" title="Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to backend/.env" className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-400 sm:px-3">
                  <MessageCircle size={15} /> <span className="hidden sm:inline">Slack setup required</span>
                </button>
              )}
              <button type="button" onClick={() => void logout()} aria-label="Log out" title="Log out" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 lg:hidden">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="workspace-content mx-auto max-w-6xl space-y-5 px-5 py-7 sm:px-10 sm:py-8">
          {user.isDemo && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Local preview account. Sending is restricted to Ethereal SMTP; Google sign-in is unchanged.
          </div>}
          {!user.slackConfigured && <p className="text-xs text-slate-500">
            Slack sends you a message when an hourly sending limit is reached. Add Slack app credentials to enable it.
          </p>}
          <div className="workspace-title flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">WORKSPACE OVERVIEW</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {search.trim()
                  ? 'Search results'
                  : dashboardSection === 'campaigns'
                    ? 'Campaigns'
                    : dashboardSection === 'campaign'
                      ? selectedCampaign?.name || 'Campaign details'
                      : dashboardSection === 'attention'
                        ? 'Needs attention'
                        : activeTab === 'scheduled' ? 'Scheduled emails' : 'Sent emails'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {dashboardSection === 'campaigns'
                  ? 'Select a campaign to see its recipients and delivery status.'
                  : dashboardSection === 'campaign'
                    ? selectedCampaign?.subject || 'Review every email in this campaign.'
                    : dashboardSection === 'attention'
                      ? 'Failed emails and delivery errors that may need a retry.'
                      : 'Your campaigns, delivery progress, and scheduled messages in one place.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="activity-live" data-status={activityStatus} role="status" aria-live="polite">
                <span />
                {activityStatus === 'live' ? 'Live activity' : activityStatus === 'offline' ? 'Connection lost' : 'Connecting…'}
              </span>
              <button type="button" onClick={() => setShowCompose(true)} className="compose-button inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
              <Plus size={17} /> Compose new email
              </button>
            </div>
          </div>

          <section aria-label="Email activity summary" className="activity-overview">
            {[
              { label: 'Scheduled', value: scheduled.length, detail: 'Waiting in your queue', icon: Clock3, tab: 'scheduled' as const, tone: 'mint' },
              { label: 'Sent', value: delivered, detail: 'Successfully delivered', icon: Send, tab: 'sent' as const, tone: 'blue' },
              { label: 'Needs attention', value: failed, detail: 'Failed delivery attempts', icon: AlertCircle, section: 'attention' as const, tone: 'amber' },
              { label: 'Campaigns', value: campaigns.length, detail: 'Total campaigns created', icon: Mail, section: 'campaigns' as const, tone: 'violet' },
            ].map((stat) => {
              const Icon = stat.icon;
              const handleClick = 'section' in stat
                ? stat.section === 'attention' ? showAttention : showCampaigns
                : () => showActivity(stat.tab);
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={handleClick}
                  aria-label={`Show ${stat.label.toLowerCase()} activity`}
                  className="activity-stat"
                >
                  <span className={`activity-stat-icon ${stat.tone}`}><Icon size={17} /></span>
                  <span className="activity-stat-value">{stat.value}</span>
                  <span className="activity-stat-label">{stat.label}</span>
                  <span className="activity-stat-detail">{stat.detail}</span>
                </button>
              );
            })}
          </section>

          {message && <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex items-center gap-2"><CheckCircle2 size={17} /> {message}</span>
            <button type="button" onClick={() => setMessage('')} aria-label="Dismiss message"><X size={16} /></button>
          </div>}
          {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle size={17} /> {error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
          </div>}
          {senders.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Connect an SMTP sender to start scheduling emails.</div>}

          {dashboardSection === 'campaigns' ? (
            <section aria-label="Campaign list" className="table-card overflow-hidden bg-white">
              {loading && campaigns.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />Loading campaigns...</div>
              ) : campaigns.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Mail size={20} /></div>
                  <p className="mt-3 text-sm font-medium text-slate-700">No campaigns yet</p>
                  <p className="mt-1 text-xs text-slate-400">Compose an email to create your first campaign.</p>
                  <button type="button" onClick={() => setShowCompose(true)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Compose email</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="workspace-table w-full min-w-[690px] text-left">
                    <thead><tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5">Campaign</th>
                      <th className="px-5 py-3.5">Sender</th>
                      <th className="px-5 py-3.5">Recipients</th>
                      <th className="px-5 py-3.5">Progress</th>
                      <th className="px-5 py-3.5">Created</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaigns.map((campaign) => {
                        const campaignSent = campaign.leads.filter((lead) => lead.status === 'SENT').length;
                        const campaignFailed = campaign.leads.filter((lead) => lead.status === 'FAILED').length;
                        const campaignScheduled = campaign.leads.filter((lead) => lead.status === 'PENDING' || lead.status === 'THROTTLED_DELAYED').length;
                        return (
                          <tr key={campaign.id} className="hover:bg-[#fbfdfb]">
                            <td colSpan={5} className="p-0">
                              <button type="button" onClick={() => showCampaign(campaign.id)} className="grid w-full grid-cols-5 items-center text-left focus-visible:outline-emerald-500">
                                <span className="min-w-0 px-5 py-4">
                                  <strong className="block truncate text-sm font-medium text-slate-800">{campaign.name}</strong>
                                  <small className="mt-1 block truncate text-xs text-slate-400">{campaign.subject}</small>
                                </span>
                                <span className="truncate px-3 py-4 text-sm text-slate-600">{campaign.senderId}</span>
                                <span className="px-3 py-4 text-sm text-slate-600">{campaign.leads.length}</span>
                                <span className="px-3 py-4 text-xs text-slate-500">{campaignSent} sent · {campaignScheduled} scheduled{campaignFailed ? ` · ${campaignFailed} failed` : ''}</span>
                                <span className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{formatDate(campaign.createdAt)}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                <span>{campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}</span>
                <span>Select a campaign to view its emails</span>
              </footer>
            </section>
          ) : (
          <>
          {dashboardSection === 'campaign' && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
              <span className="text-sm text-slate-600">{selectedCampaign?.leads.length || 0} emails in this campaign</span>
              <button type="button" onClick={showCampaigns} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Back to campaigns</button>
            </div>
          )}
          {dashboardSection !== 'attention' && dashboardSection !== 'campaign' && (
          <div className="workspace-tabs flex flex-col justify-between gap-3 border-b border-slate-100 pb-2 sm:flex-row sm:items-center">
            <div className="flex w-fit rounded-lg bg-slate-100 p-1">
              <button type="button" aria-pressed={activeTab === 'scheduled'} onClick={() => setActiveTab('scheduled')} className={`rounded-md px-4 py-2 text-sm ${activeTab === 'scheduled' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Scheduled <span className="ml-1 text-xs text-slate-400">{scheduled.length}</span></button>
              <button type="button" aria-pressed={activeTab === 'sent'} onClick={() => setActiveTab('sent')} className={`rounded-md px-4 py-2 text-sm ${activeTab === 'sent' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sent <span className="ml-1 text-xs text-slate-400">{sent.length}</span></button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => {
                void loadDashboard(false, true);
                if (search.trim()) {
                  setSearchResult(null);
                  setSearchLoading(true);
                  setSearchRefreshVersion((version) => version + 1);
                }
              }} title="Refresh emails" aria-label="Refresh emails" aria-busy={loading || searchLoading} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          )}

          <section className="table-card overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="workspace-table w-full min-w-[690px] text-left">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Recipient</th>
                    <th className="px-5 py-3.5">Subject</th>
                    <th className="px-5 py-3.5">{search.trim() ? 'Date' : activeTab === 'scheduled' && dashboardSection !== 'attention' ? 'Scheduled for' : 'Sent at'}</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchLoading ? (
                    <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />Searching emails...</td></tr>
                  ) : loading && !campaigns.length ? (
                    <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />Loading emails...</td></tr>
                  ) : visibleRows.length === 0 ? (
                    <tr><td colSpan={4} className="py-16 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Mail size={20} /></div>
                      <p className="mt-3 text-sm font-medium text-slate-700">{search ? 'No matching emails' : dashboardSection === 'attention' ? 'Nothing needs attention' : dashboardSection === 'campaign' ? 'This campaign has no email records' : `No ${activeTab} emails yet`}</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? 'Try a different email address or subject.' : dashboardSection === 'attention' ? 'Failed deliveries will appear here with their error details.' : dashboardSection === 'campaign' ? 'Email activity for this campaign will show up here.' : 'Your email activity will show up here.'}</p>
                    </td></tr>
                  ) : visibleRows.map((row) => (
                    <tr key={row.id} className="group border-b border-slate-100 hover:bg-[#fbfdfb]">
                      <td className="px-2 py-4 sm:px-3">
                        <p className="text-sm font-medium text-slate-800">To: {row.email}</p>
                        <p className="mt-1 text-xs text-slate-400">{row.name}</p>
                      </td>
                      <td className="max-w-xs truncate px-3 py-4 text-sm text-slate-700">
                        <span className="ml-1 font-medium">{row.subject}</span><span className="text-slate-400"> - {row.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{formatDate(search.trim() ? row.sentAt || row.scheduledAt : activeTab === 'sent' || dashboardSection === 'attention' ? row.sentAt : row.scheduledAt)}</td>
                      <td className="px-2 py-4 sm:px-3">
                        <StatusLabel status={row.status} />
                        {row.errorMessage && <p title={row.errorMessage} className="mt-1 max-w-44 truncate text-[11px] text-rose-600">{row.errorMessage}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              <span>{visibleRows.length} {visibleRows.length === 1 ? 'email' : 'emails'}</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updates every few seconds</span>
            </footer>
          </section>

          {user.slackConnected && <p className="text-center text-xs text-slate-400">Slack is connected for hourly rate-limit alerts.</p>}
          </>
          )}
        </main>
      </div>
      {showCompose && <ComposePage
        senders={senders}
        maxHourlyLimit={maxHourlyLimit}
        minimumDelayMs={minimumDelayMs}
        onClose={() => setShowCompose(false)}
        onScheduled={() => {
          setMessage('Your emails are scheduled. You can follow their status here.');
          void loadDashboard();
        }}
      />}
      {showSenders && <SenderManagement
        senders={senders}
        maxHourlyLimit={maxHourlyLimit}
        minimumDelayMs={minimumDelayMs}
        onClose={() => setShowSenders(false)}
        onChanged={() => loadDashboard(true)}
      />}
    </div>
  );
}
