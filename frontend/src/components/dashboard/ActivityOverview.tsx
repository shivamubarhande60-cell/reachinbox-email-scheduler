import { AlertCircle, Clock3, Mail, Send } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';

/**
 * Interactive 4-card summary grid displaying scheduled, sent/processed, failed, and total campaigns.
 */
export function ActivityOverview() {
  const { user } = useAuth();
  const {
    scheduledRows,
    sentRows,
    deliveredCount,
    failedCount,
    campaigns,
    showActivity,
    showAttention,
    showCampaigns,
  } = useDashboard();

  if (!user) return null;

  const stats = [
    {
      label: 'Scheduled',
      value: scheduledRows.length,
      detail: 'Waiting in your queue',
      icon: Clock3,
      tone: 'mint',
      onClick: () => showActivity('scheduled'),
    },
    {
      label: user.simulatedDelivery ? 'Processed' : 'Sent',
      value: user.simulatedDelivery
        ? sentRows.filter((row) => row.status === 'SIMULATED').length
        : deliveredCount,
      detail: user.simulatedDelivery ? 'Simulated; not delivered' : 'Successfully delivered',
      icon: Send,
      tone: 'blue',
      onClick: () => showActivity('sent'),
    },
    {
      label: 'Needs attention',
      value: failedCount,
      detail: 'Failed delivery attempts',
      icon: AlertCircle,
      tone: 'amber',
      onClick: showAttention,
    },
    {
      label: 'Campaigns',
      value: campaigns.length,
      detail: 'Total campaigns created',
      icon: Mail,
      tone: 'violet',
      onClick: showCampaigns,
    },
  ];

  return (
    <section aria-label="Email activity summary" className="activity-overview">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            aria-label={`Show ${stat.label.toLowerCase()} activity`}
            className="activity-stat"
          >
            <span className={`activity-stat-icon ${stat.tone}`}>
              <Icon size={17} />
            </span>
            <span className="activity-stat-value">{stat.value}</span>
            <span className="activity-stat-label">{stat.label}</span>
            <span className="activity-stat-detail">{stat.detail}</span>
          </button>
        );
      })}
    </section>
  );
}
