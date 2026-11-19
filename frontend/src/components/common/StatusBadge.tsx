interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  SENT: {
    label: 'Sent',
    badgeClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    dotClass: 'bg-emerald-600',
  },
  SIMULATED: {
    label: 'Simulated',
    badgeClass: 'border-sky-200 bg-sky-50/70 text-sky-800',
    dotClass: 'bg-sky-600',
  },
  FAILED: {
    label: 'Failed',
    badgeClass: 'border-rose-200 bg-rose-50/70 text-rose-800',
    dotClass: 'bg-rose-600',
  },
  THROTTLED_DELAYED: {
    label: 'Queued for later',
    badgeClass: 'border-amber-200 bg-amber-50/70 text-amber-800',
    dotClass: 'bg-amber-500',
  },
};

const DEFAULT_STATUS = {
  label: 'Scheduled',
  badgeClass: 'border-zinc-200 bg-zinc-100/80 text-zinc-700',
  dotClass: 'bg-amber-500',
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
