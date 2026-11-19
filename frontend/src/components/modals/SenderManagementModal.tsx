import { useState, type FormEvent } from 'react';
import { LoaderCircle, Plus, Send, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { senderApi } from '../../services/senderApi';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';
import type { Sender } from '../../types';
import { Modal } from '../common/Modal';

/**
 * Modal for inspecting configured SMTP senders and adding/removing user-managed senders.
 */
export function SenderManagementModal() {
  const { user } = useAuth();
  const { senders, maxHourlyLimit, minimumDelayMs, setShowSenders, loadDashboard } = useDashboard();

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

  if (!user) return null;

  const simulatedDelivery = user.simulatedDelivery;

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
      setPassword('');
      setNotice('SMTP connection verified and sender added.');
      await loadDashboard(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not connect this sender.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (sender: Sender) => {
    if (!sender.managed) return;
    if (
      !window.confirm(`Remove ${sender.name}? Scheduled emails using this sender must finish first.`)
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await senderApi.removeSender(sender.id);
      setNotice(`${sender.name} was removed.`);
      await loadDashboard(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not remove this sender.'));
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400';

  return (
    <Modal titleId="senders-title" busy={busy} onClose={() => setShowSenders(false)}>
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
            SMTP SETTINGS
          </p>
          <h2 id="senders-title" className="mt-1 text-lg font-semibold text-slate-900">
            Manage senders
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSenders(false)}
          disabled={busy}
          aria-label="Close sender management"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </header>

      <div
        className={`grid gap-6 p-5 sm:p-7 ${simulatedDelivery ? '' : 'lg:grid-cols-[1fr_1.1fr]'}`}
      >
        <section aria-labelledby="configured-senders-title">
          <h3 id="configured-senders-title" className="text-sm font-semibold text-slate-800">
            Configured senders <span className="text-slate-400">({senders.length})</span>
          </h3>
          <div className="mt-3 space-y-2">
            {senders.length ? (
              senders.map((sender) => (
                <div
                  key={sender.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Send size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{sender.name}</p>
                    <p className="truncate text-xs text-slate-500">{sender.from}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {sender.maxEmailsPerHour}/hour · {Math.ceil(sender.minimumDelayMs / 1000)} sec
                      minimum gap
                    </p>
                    {sender.simulated && (
                      <span className="mt-1 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">
                        Simulated · no email sent
                      </span>
                    )}
                    {!sender.managed && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        Environment configured
                      </span>
                    )}
                  </div>
                  {sender.managed && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(sender)}
                      disabled={busy}
                      title={`Remove ${sender.name}`}
                      aria-label={`Remove ${sender.name}`}
                      className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500">
                No senders connected yet.
              </p>
            )}
          </div>
        </section>

        {simulatedDelivery ? (
          <p
            role="status"
            className="self-start rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900"
          >
            Demo delivery is active. Emails are processed by the scheduler and marked as simulated;
            no SMTP connection is made and no messages are sent.
          </p>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Connect a sender</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                SMTP credentials are verified before saving and encrypted in the database.
              </p>
            </div>
            <label className="block text-xs font-medium text-slate-600">
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
            <label className="block text-xs font-medium text-slate-600">
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
              <label className="block text-xs font-medium text-slate-600">
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
              <label className="block text-xs font-medium text-slate-600">
                Port
                <input
                  type="number"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  required
                  min={1}
                  max={65535}
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
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
            <label className="block text-xs font-medium text-slate-600">
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
              <label className="block text-xs font-medium text-slate-600">
                Emails per hour
                <input
                  type="number"
                  value={hourlyLimit}
                  onChange={(event) => setHourlyLimit(Number(event.target.value))}
                  required
                  min={1}
                  max={maxHourlyLimit}
                  className={fieldClass}
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Maximum {maxHourlyLimit}
                </span>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Minimum delay (sec)
                <input
                  type="number"
                  value={delaySeconds}
                  onChange={(event) => setDelaySeconds(Number(event.target.value))}
                  required
                  min={Math.ceil(minimumDelayMs / 1000)}
                  step={1}
                  className={fieldClass}
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Minimum {Math.ceil(minimumDelayMs / 1000)} sec
                </span>
              </label>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
              >
                {notice}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={16} />}
              {busy ? 'Saving sender…' : 'Verify and add sender'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
