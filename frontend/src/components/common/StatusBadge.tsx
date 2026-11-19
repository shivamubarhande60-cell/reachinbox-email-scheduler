interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  SENT: {
    label: 'Sent',
    badgeClass:
      'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  SIMULATED: {
    label: 'Simulated',
    badgeClass:
      'border-sky-200 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
    dotClass: 'bg-sky-600 dark:bg-sky-400',
  },
  FAILED: {
    label: 'Failed',
    badgeClass:
      'border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    dotClass: 'bg-rose-600 dark:bg-rose-400',
  },
  THROTTLED_DELAYED: {
    label: 'Queued for later',
    badgeClass:
      'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
  },
  SENDING: {
    label: 'Sending',
    badgeClass:
      'border-teal-200 bg-teal-50/80 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
    dotClass: 'bg-teal-600 dark:bg-teal-400',
  },
};

const DEFAULT_STATUS = {
  label: 'Scheduled',
  badgeClass:
    'border-zinc-200 bg-zinc-100/80 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300',
  dotClass: 'bg-amber-500 dark:bg-amber-400',
};

/**
 * Renders a hairline-bordered status pill for an email delivery state.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_STATUS;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
