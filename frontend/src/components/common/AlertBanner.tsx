import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertTone = 'success' | 'error' | 'info' | 'warning';

interface AlertBannerProps {
  tone: AlertTone;
  children: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

const TONE_STYLES: Record<AlertTone, string> = {
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
  error: 'border-rose-200 bg-rose-50/70 text-rose-800',
  info: 'border-sky-200 bg-sky-50/70 text-sky-900',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-900',
};

/**
 * Reusable accessible banner for status notices, warnings, and errors.
 */
export function AlertBanner({
  tone,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
}: AlertBannerProps) {
  const role = tone === 'error' ? 'alert' : 'status';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertCircle;

  return (
    <div
      role={role}
      className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${TONE_STYLES[tone]}`}
    >
      <span className="flex items-start gap-2.5">
        <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="rounded p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
