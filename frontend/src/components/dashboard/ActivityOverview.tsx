import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';

/**
 * Unified hairline-divided 4-column metric strip for quick workspace filtering.
 */
export function ActivityOverview() {
  const { user } = useAuth();
  const {
    scheduledRows,
    sentRows,
    deliveredCount,
    failedCount,
    campaigns,
    dashboardSection,
    activeTab,
    search,
    showActivity,
    showAttention,
    showCampaigns,
  } = useDashboard();

  if (!user) return null;

  const hasSearch = Boolean(search.trim());
  const processedCount = user.simulatedDelivery
    ? sentRows.filter((row) => row.status === 'SIMULATED').length
    : deliveredCount;

  const stats = [
    {
      label: 'Scheduled',
      value: scheduledRows.length,
      detail: 'Queued for delivery',
      active: dashboardSection === 'activity' && activeTab === 'scheduled' && !hasSearch,
      onClick: () => showActivity('scheduled'),
    },
    {
      label: user.simulatedDelivery ? 'Processed' : 'Sent',
      value: processedCount,
      detail: user.simulatedDelivery ? 'Simulated in demo mode' : 'Delivered via SMTP',
      active: dashboardSection === 'activity' && activeTab === 'sent' && !hasSearch,
      onClick: () => showActivity('sent'),
    },
    {
      label: 'Needs attention',
      value: failedCount,
      detail: 'Failed delivery attempts',
      active: dashboardSection === 'attention',
      onClick: showAttention,
    },
    {
      label: 'Campaigns',
      value: campaigns.length,
      detail: 'Total campaigns created',
      active: dashboardSection === 'campaigns' || dashboardSection === 'campaign',
      onClick: showCampaigns,
    },
  ];

  return (
    <section aria-label="Email activity summary">
      <div className="grid grid-cols-2 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#111113]">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            aria-pressed={stat.active}
            aria-label={`Show ${stat.label.toLowerCase()} activity`}
            className={`relative flex flex-col items-start px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
              stat.active ? 'bg-zinc-50/70 dark:bg-zinc-900/80' : 'bg-white dark:bg-[#111113]'
            }`}
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </span>
            <span className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100">
              {stat.value}
            </span>
            <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{stat.detail}</span>
            {stat.active && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0f766e] dark:bg-[#14b8a6]"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
