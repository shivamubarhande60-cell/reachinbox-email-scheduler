import { useMemo, useState } from 'react';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { EmptyState } from '../common/EmptyState';

interface TimelineBucket {
  key: string;
  label: string;
  sent: number;
  queued: number;
  failed: number;
  total: number;
}

/**
 * Real-data campaign analytics view with KPI strip, status breakdown, SVG timeline, and sender capacity table.
 */
export function AnalyticsView() {
  const { user } = useAuth();
  const {
    rows,
    senders,
    scheduledRows,
    deliveredCount,
    failedCount,
    showActivity,
    showAttention,
    setStatusFilter,
    setShowCompose,
  } = useDashboard();

  const [hoveredBucket, setHoveredBucket] = useState<TimelineBucket | null>(null);

  const simulatedCount = useMemo(
    () => rows.filter((row) => row.status === 'SIMULATED').length,
    [rows],
  );
  const completedCount = user?.simulatedDelivery ? simulatedCount : deliveredCount;

  const totalCount = rows.length;
  const deliveryRate = totalCount ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0';
  const failureRate = totalCount ? ((failedCount / totalCount) * 100).toFixed(1) : '0.0';

  const statusSegments = useMemo(() => {
    const pendingCount = rows.filter((row) => row.status === 'PENDING').length;
    const throttledCount = rows.filter((row) => row.status === 'THROTTLED_DELAYED').length;

    return [
      {
        key: user?.simulatedDelivery ? 'SIMULATED' : 'SENT',
        label: user?.simulatedDelivery ? 'Simulated' : 'Sent',
        count: completedCount,
        colorClass: 'bg-[#0f766e] dark:bg-[#14b8a6]',
        onClick: () => {
          showActivity('sent');
          setStatusFilter(user?.simulatedDelivery ? 'SIMULATED' : 'SENT');
        },
      },
      {
        key: 'PENDING',
        label: 'Scheduled',
        count: pendingCount,
        colorClass: 'bg-amber-400 dark:bg-amber-500',
        onClick: () => {
          showActivity('scheduled');
          setStatusFilter('PENDING');
        },
      },
      {
        key: 'THROTTLED_DELAYED',
        label: 'Queued for later',
        count: throttledCount,
        colorClass: 'bg-sky-500 dark:bg-sky-400',
        onClick: () => {
          showActivity('scheduled');
          setStatusFilter('THROTTLED_DELAYED');
        },
      },
      {
        key: 'FAILED',
        label: 'Failed',
        count: failedCount,
        colorClass: 'bg-rose-600 dark:bg-rose-500',
        onClick: () => showAttention(),
      },
    ];
  }, [
    rows,
    completedCount,
    failedCount,
    user?.simulatedDelivery,
    showActivity,
    setStatusFilter,
    showAttention,
  ]);

  const timelineBuckets = useMemo<TimelineBucket[]>(() => {
    const timestamps = rows
      .map((row) => row.sentAt || row.scheduledAt || row.createdAt)
      .filter((val): val is string => Boolean(val))
      .map((val) => new Date(val).getTime())
      .filter((ms) => !Number.isNaN(ms));

    if (!timestamps.length) return [];

    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const spanHours = (maxTs - minTs) / 3600000;
    const byDay = spanHours > 24;

    const bucketMap = new Map<string, TimelineBucket>();

    for (const row of rows) {
      const rawDate = row.sentAt || row.scheduledAt || row.createdAt;
      if (!rawDate) continue;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) continue;

      const key = byDay
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;

      const label = byDay
        ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
        : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
            new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
          );

      const existing = bucketMap.get(key) ?? {
        key,
        label,
        sent: 0,
        queued: 0,
        failed: 0,
        total: 0,
      };

      if (row.status === 'SENT' || row.status === 'SIMULATED') existing.sent += 1;
      else if (row.status === 'FAILED') existing.failed += 1;
      else existing.queued += 1;

      existing.total += 1;
      bucketMap.set(key, existing);
    }

    return [...bucketMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, bucket]) => bucket);
  }, [rows]);

  const maxBucketTotal = useMemo(
    () => Math.max(1, ...timelineBuckets.map((b) => b.total)),
    [timelineBuckets],
  );

  const senderMetrics = useMemo(() => {
    const countsBySender = new Map<string, { total: number; sent: number; failed: number }>();
    for (const row of rows) {
      const current = countsBySender.get(row.senderId) ?? { total: 0, sent: 0, failed: 0 };
      current.total += 1;
      if (row.status === 'SENT' || row.status === 'SIMULATED') current.sent += 1;
      if (row.status === 'FAILED') current.failed += 1;
      countsBySender.set(row.senderId, current);
    }

    const knownIds = new Set(senders.map((s) => s.id));
    const extraSenders = [...countsBySender.keys()]
      .filter((id) => !knownIds.has(id))
      .map((id) => ({
        id,
        name: id,
        from: 'Unlisted sender',
        maxEmailsPerHour: 200,
        minimumDelayMs: 2000,
        managed: false,
        simulated: false,
      }));

    return [...senders, ...extraSenders].map((sender) => {
      const stats = countsBySender.get(sender.id) ?? { total: 0, sent: 0, failed: 0 };
      const sharePct = totalCount ? Math.round((stats.total / totalCount) * 100) : 0;
      return { sender, stats, sharePct };
    });
  }, [rows, senders, totalCount]);

  if (!user) return null;

  if (totalCount === 0 && senders.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
        <EmptyState
          title="No analytics data yet"
          description="Schedule your first campaign to inspect dispatch throughput, delivery rates, and sender allocation."
          action={
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-lg bg-[#0f766e] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950"
            >
              Compose campaign
            </button>
          }
        />
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#111113]">
        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total recipients</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100">
            {totalCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Across all campaigns</p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {user.simulatedDelivery ? 'Processed rate' : 'Delivery rate'}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#0f766e] tabular-nums dark:text-[#14b8a6]">
            {deliveryRate}%
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {completedCount} completed
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Queued / throttled</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100">
            {scheduledRows.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Waiting in BullMQ</p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Failure rate</p>
          <p
            className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${
              failedCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {failureRate}%
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {failedCount} failed
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Status distribution
          </h2>
          <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            Click a segment to filter
          </span>
        </div>

        <div
          className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="presentation"
        >
          {totalCount > 0 &&
            statusSegments.map((segment) => {
              if (segment.count === 0) return null;
              const pct = (segment.count / totalCount) * 100;
              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={segment.onClick}
                  title={`${segment.label}: ${segment.count}`}
                  aria-label={`Filter by ${segment.label} (${segment.count})`}
                  className={`${segment.colorClass} h-full transition-opacity hover:opacity-85`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusSegments.map((segment) => (
            <button
              key={segment.key}
              type="button"
              onClick={segment.onClick}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
            >
              <span className={`h-2 w-2 rounded-full ${segment.colorClass}`} aria-hidden="true" />
              <span>{segment.label}</span>
              <span className="font-mono font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
                {segment.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#111113]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Dispatch volume timeline
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Grouped by scheduled or sent window
              </p>
            </div>
            {hoveredBucket && (
              <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-700 tabular-nums dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {hoveredBucket.label}: {hoveredBucket.sent} sent · {hoveredBucket.queued} queued ·{' '}
                {hoveredBucket.failed} failed
              </span>
            )}
          </div>

          {timelineBuckets.length === 0 ? (
            <p className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Schedule emails to populate the dispatch timeline.
            </p>
          ) : (
            <div className="mt-5">
              <svg
                viewBox="0 0 480 160"
                className="h-44 w-full overflow-visible"
                role="img"
                aria-label="Dispatch volume timeline bar chart"
              >
                {[0, 0.5, 1].map((ratio) => {
                  const y = 130 - ratio * 110;
                  return (
                    <line
                      key={ratio}
                      x1={0}
                      y1={y}
                      x2={480}
                      y2={y}
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                      strokeDasharray={ratio === 0 ? undefined : '3 3'}
                    />
                  );
                })}

                {timelineBuckets.map((bucket, idx) => {
                  const slotWidth = 480 / timelineBuckets.length;
                  const barWidth = Math.min(28, slotWidth * 0.58);
                  const x = idx * slotWidth + (slotWidth - barWidth) / 2;

                  const sentH = (bucket.sent / maxBucketTotal) * 110;
                  const queuedH = (bucket.queued / maxBucketTotal) * 110;
                  const failedH = (bucket.failed / maxBucketTotal) * 110;

                  const ySent = 130 - sentH;
                  const yQueued = ySent - queuedH;
                  const yFailed = yQueued - failedH;

                  return (
                    <g
                      key={bucket.key}
                      onMouseEnter={() => setHoveredBucket(bucket)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={idx * slotWidth}
                        y={10}
                        width={slotWidth}
                        height={130}
                        fill="transparent"
                      />
                      {sentH > 0 && (
                        <rect
                          x={x}
                          y={ySent}
                          width={barWidth}
                          height={sentH}
                          rx={2}
                          className="fill-[#0f766e] dark:fill-[#14b8a6]"
                        />
                      )}
                      {queuedH > 0 && (
                        <rect
                          x={x}
                          y={yQueued}
                          width={barWidth}
                          height={queuedH}
                          rx={2}
                          className="fill-amber-400 dark:fill-amber-500"
                        />
                      )}
                      {failedH > 0 && (
                        <rect
                          x={x}
                          y={yFailed}
                          width={barWidth}
                          height={failedH}
                          rx={2}
                          className="fill-rose-600 dark:fill-rose-500"
                        />
                      )}
                      <text
                        x={x + barWidth / 2}
                        y={148}
                        textAnchor="middle"
                        className="fill-zinc-500 font-mono text-[9px] dark:fill-zinc-400"
                      >
                        {bucket.label.slice(0, 7)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Sender throughput &amp; allocation
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Configured SMTP rate caps and recipient volume share
            </p>
          </div>

          {senderMetrics.length === 0 ? (
            <p className="px-5 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No SMTP senders connected yet.
            </p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {senderMetrics.map(({ sender, stats, sharePct }) => (
                <div key={sender.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {sender.name}
                      </p>
                      <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {sender.maxEmailsPerHour}/hr · {Math.ceil(sender.minimumDelayMs / 1000)}s
                        gap
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs tabular-nums">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {stats.total} emails
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">{sharePct}% share</p>
                    </div>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full bg-[#0f766e] dark:bg-[#14b8a6]"
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
