import { useState, type FormEvent } from 'react';
import { LoaderCircle, Plus, Server, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { senderApi } from '../../services/senderApi';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { useToast } from '../../state/useToast';
import type { Sender } from '../../types';
import { AlertBanner } from '../common/AlertBanner';
import { Modal } from '../common/Modal';

const SMTP_PRESETS = [
  { id: 'ethereal', label: 'Ethereal', host: 'smtp.ethereal.email', port: '587' },
  { id: 'resend', label: 'Resend', host: 'smtp.resend.com', port: '465' },
  { id: 'postmark', label: 'Postmark', host: 'smtp.postmarkapp.com', port: '587' },
  { id: 'custom', label: 'Custom', host: '', port: '587' },
] as const;

/**
 * Modal for inspecting configured SMTP senders, quick provider presets, and adding/removing senders.
 */
export function SenderManagementModal() {
  const { user } = useAuth();
  const { senders, maxHourlyLimit, minimumDelayMs, setShowSenders, loadDashboard } = useDashboard();
  const { pushToast } = useToast();

  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [host, setHost] = useState('smtp.ethereal.email');
  const [port, setPort] = useState('587');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(maxHourlyLimit);
  const [delaySeconds, setDelaySeconds] = useState(Math.ceil(minimumDelayMs / 1000));
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!user) return null;

  const simulatedDelivery = user.simulatedDelivery;

  const applyPreset = (presetHost: string, presetPort: string) => {
    setHost(presetHost);
    setPort(presetPort);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await senderApi.createSender({
        name,
        from,
        host,
        port: Number(port),
        username,
        password,
        maxEmailsPerHour: hourlyLimit,
        minimumDelayMs: delaySeconds * 1000,
      });
      const addedName = name.trim();
      setName('');
      setFrom('');
      setUsername('');
      setPassword('');
      setNotice('SMTP connection verified and sender added.');
      pushToast({
        title: 'SMTP sender connected',
        description: addedName,
        tone: 'success',
      });
      await loadDashboard(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not connect this sender.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (sender: Sender) => {
    if (!sender.managed) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await senderApi.removeSender(sender.id);
      setConfirmRemoveId(null);
      setNotice(`${sender.name} was removed.`);
      pushToast({
        title: 'Sender removed',
        description: sender.name,
        tone: 'info',
      });
      await loadDashboard(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not remove this sender.'));
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f766e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#14b8a6]';

  return (
    <Modal titleId="senders-title" busy={busy} onClose={() => setShowSenders(false)}>
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <div>
          <h2 id="senders-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            SMTP senders
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Verify credentials and manage per-sender throughput caps.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSenders(false)}
          disabled={busy}
          aria-label="Close sender management"
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <div
        className={`grid gap-6 p-5 sm:p-6 ${simulatedDelivery ? '' : 'lg:grid-cols-[1fr_1.15fr]'}`}
      >
        <section aria-labelledby="configured-senders-title">
          <div className="flex items-center justify-between">
            <h3
              id="configured-senders-title"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Configured senders
            </h3>
            <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {senders.length}
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {senders.length ? (
              senders.map((sender) => {
                const isConfirming = confirmRemoveId === sender.id;
                return (
                  <div
                    key={sender.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                        aria-hidden="true"
                      >
                        <Server size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {sender.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {sender.from}
                        </p>
                        <p className="mt-1.5 font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                          {sender.maxEmailsPerHour}/hr ·{' '}
                          {Math.ceil(sender.minimumDelayMs / 1000)}s gap
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {sender.simulated && (
                            <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                              Simulated
                            </span>
                          )}
                          {!sender.managed && (
                            <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                              Environment
                            </span>
                          )}
                        </div>
                      </div>

                      {sender.managed && !isConfirming && (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(sender.id)}
                          disabled={busy}
                          title={`Remove ${sender.name}`}
                          aria-label={`Remove ${sender.name}`}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {sender.managed && isConfirming && (
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200 pt-2.5 text-xs dark:border-zinc-800">
                        <span className="text-zinc-600 dark:text-zinc-300">
                          Remove this sender?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            disabled={busy}
                            className="rounded border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemove(sender)}
                            disabled={busy}
                            className="rounded bg-rose-600 px-2.5 py-1 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                No senders connected yet.
              </p>
            )}
          </div>
        </section>

        {simulatedDelivery ? (
          <AlertBanner tone="info">
            Demo delivery mode is active. Emails are processed and marked as simulated without
            making outbound SMTP connections.
          </AlertBanner>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Connect a sender
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Verified before saving and encrypted with AES-256-GCM.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="mr-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Presets:
              </span>
              {SMTP_PRESETS.map((preset) => {
                const selected = host === preset.host && port === preset.port;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.host, preset.port)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      selected
                        ? 'border-[#0f766e] bg-[#0f766e]/10 font-medium text-[#0f766e] dark:border-[#14b8a6] dark:bg-[#14b8a6]/15 dark:text-[#14b8a6]'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Sender name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                className={fieldClass}
                placeholder="Ethereal sender"
              />
            </label>

            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Sender email
              <input
                type="email"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                required
                maxLength={320}
                className={fieldClass}
                placeholder="you@example.com"
              />
            </label>

            <div className="grid grid-cols-[1fr_100px] gap-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                SMTP host
                <input
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  required
                  maxLength={255}
                  className={fieldClass}
                  placeholder="smtp.example.com"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Port
                <input
                  type="number"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  required
                  min={1}
                  max={65535}
                  className={`${fieldClass} font-mono tabular-nums`}
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              SMTP username
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                maxLength={255}
                className={fieldClass}
              />
            </label>

            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              SMTP password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={4096}
                className={fieldClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Emails per hour
                <input
                  type="number"
                  value={hourlyLimit}
                  onChange={(event) => setHourlyLimit(Number(event.target.value))}
                  required
                  min={1}
                  max={maxHourlyLimit}
                  className={`${fieldClass} font-mono tabular-nums`}
                />
                <span className="mt-1 block font-mono text-[11px] font-normal text-zinc-400 tabular-nums">
                  Max {maxHourlyLimit}/hr
                </span>
              </label>

              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Minimum delay (sec)
                <input
                  type="number"
                  value={delaySeconds}
                  onChange={(event) => setDelaySeconds(Number(event.target.value))}
                  required
                  min={Math.ceil(minimumDelayMs / 1000)}
                  step={1}
                  className={`${fieldClass} font-mono tabular-nums`}
                />
                <span className="mt-1 block font-mono text-[11px] font-normal text-zinc-400 tabular-nums">
                  Min {Math.ceil(minimumDelayMs / 1000)}s
                </span>
              </label>
            </div>

            {error && <AlertBanner tone="error">{error}</AlertBanner>}
            {notice && <AlertBanner tone="success">{notice}</AlertBanner>}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#115e59] disabled:opacity-60 dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
              ) : (
                <Plus size={15} aria-hidden="true" />
              )}
              <span>{busy ? 'Verifying sender…' : 'Verify and add sender'}</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
