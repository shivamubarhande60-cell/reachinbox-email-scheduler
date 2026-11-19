interface StatusBadgeProps {
  status: string;
}

/**
 * Renders a color-coded status pill for an email delivery state.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const isSent = status === 'SENT';
  const isSimulated = status === 'SIMULATED';
  const isFailed = status === 'FAILED';

  const label = isSimulated
    ? 'Simulated'
    : isSent
      ? 'Sent'
      : isFailed
        ? 'Failed'
        : status === 'THROTTLED_DELAYED'
          ? 'Queued for later'
          : 'Scheduled';

  const color = isSent
    ? 'bg-emerald-50 text-emerald-700'
    : isSimulated
      ? 'bg-sky-50 text-sky-700'
      : isFailed
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-700';

  const dotColor = isSent
    ? 'bg-emerald-500'
    : isSimulated
      ? 'bg-sky-500'
      : isFailed
        ? 'bg-rose-500'
        : 'bg-amber-500';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
