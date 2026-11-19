import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type AlertTone = 'success' | 'error' | 'info' | 'warning';

interface AlertBannerProps {
  tone: AlertTone;
  children: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

const TONE_STYLES: Record<AlertTone, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  error: 'border-rose-100 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

/**
 * Reusable accessible banner for status notices, warnings, and errors.
 */
export function AlertBanner({ tone, children, onDismiss, dismissLabel = 'Dismiss' }: AlertBannerProps) {
  const role = tone === 'error' ? 'alert' : 'status';
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={role}
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${TONE_STYLES[tone]}`}
    >
      <span className="flex items-center gap-2">
        {(tone === 'success' || tone === 'error') && <Icon size={17} />}
        <span>{children}</span>
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={dismissLabel}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
