import { useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { useDashboard } from '../../state/useDashboard';
import { useToast } from '../../state/useToast';
import { formatDate } from '../../utils/date';
import { StatusBadge } from '../common/StatusBadge';

/**
 * Slide-over right inspector drawer displaying full delivery lifecycle, metadata, and message body.
 */
export function EmailDetailDrawer() {
  const { selectedEmail, setSelectedEmail } = useDashboard();
  const { pushToast } = useToast();

  useEffect(() => {
    if (!selectedEmail) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedEmail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, setSelectedEmail]);

  if (!selectedEmail) return null;

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      pushToast({ title: `${label} copied`, tone: 'success' });
    } catch {
      pushToast({ title: `Could not copy ${label.toLowerCase()}`, tone: 'error' });
    }
  };

  const finalLabel =
    selectedEmail.status === 'SENT'
      ? 'Delivered via SMTP'
      : selectedEmail.status === 'SIMULATED'
        ? 'Simulated delivery'
        : selectedEmail.status === 'FAILED'
          ? 'Delivery failed'
          : selectedEmail.status === 'THROTTLED_DELAYED'
            ? 'Deferred to next UTC hour'
            : 'Waiting in queue';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/40 backdrop-blur-[2px] dark:bg-black/60"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelectedEmail(null);
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-drawer-title"
        className="flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#111113]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id="email-drawer-title"
                className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {selectedEmail.email}
              </h2>
              <button
                type="button"
                onClick={() => void copyText(selectedEmail.email, 'Email address')}
                aria-label="Copy recipient address"
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Copy size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2">
              <StatusBadge status={selectedEmail.status} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedEmail(null)}
            aria-label="Close email inspector"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section aria-label="Delivery timeline">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Delivery lifecycle
            </h3>
            <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
              <li className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-400"
                  aria-hidden="true"
                />
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Queued in MySQL &amp; BullMQ
                </p>
                <p className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  Lead #{selectedEmail.id}
                  {selectedEmail.createdAt ? ` · ${formatDate(selectedEmail.createdAt)}` : ''}
                </p>
              </li>

              <li className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Scheduled dispatch target
                </p>
                <p className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatDate(selectedEmail.scheduledAt)}
                </p>
              </li>

              <li className="relative">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
                    selectedEmail.status === 'FAILED'
                      ? 'bg-rose-600'
                      : selectedEmail.status === 'SENT' || selectedEmail.status === 'SIMULATED'
                        ? 'bg-[#0f766e] dark:bg-[#14b8a6]'
                        : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  aria-hidden="true"
                />
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{finalLabel}</p>
                <p className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  {selectedEmail.sentAt ? formatDate(selectedEmail.sentAt) : 'Pending execution'}
                </p>
              </li>
            </ol>
          </section>

          <section
            aria-label="Campaign metadata"
            className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Campaign</p>
              <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                {selectedEmail.name}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Sender ID</p>
              <p className="mt-0.5 truncate font-mono text-zinc-900 dark:text-zinc-100">
                {selectedEmail.senderId}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Spacing</p>
              <p className="mt-0.5 font-mono text-zinc-900 tabular-nums dark:text-zinc-100">
                {selectedEmail.delayMs !== undefined
                  ? `${Math.ceil(selectedEmail.delayMs / 1000)}s gap`
                  : 'Sender default'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Hourly cap</p>
              <p className="mt-0.5 font-mono text-zinc-900 tabular-nums dark:text-zinc-100">
                {selectedEmail.hourlyLimit ? `${selectedEmail.hourlyLimit}/hr` : 'Sender default'}
              </p>
            </div>
          </section>

          <section aria-label="Message content">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Subject</h3>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {selectedEmail.subject}
            </p>

            {selectedEmail.body && (
              <div className="mt-3">
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Message body
                </h3>
                <div className="mt-1.5 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200">
                  {selectedEmail.body}
                </div>
              </div>
            )}
          </section>

          {selectedEmail.errorMessage && (
            <section aria-label="Diagnostics">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  Diagnostics
                </h3>
                <button
                  type="button"
                  onClick={() => void copyText(selectedEmail.errorMessage || '', 'Diagnostics')}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <Copy size={11} aria-hidden="true" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-rose-200 bg-rose-50/70 p-3 font-mono text-xs leading-relaxed text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {selectedEmail.errorMessage}
              </pre>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
