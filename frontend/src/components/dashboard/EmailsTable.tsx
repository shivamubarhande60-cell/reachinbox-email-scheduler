import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

/**
 * Displays scheduled, sent, failed, campaign-specific, or search-filtered email rows.
 */
export function EmailsTable() {
  const { user } = useAuth();
  const {
    campaigns,
    dashboardSection,
    selectedCampaign,
    activeTab,
    scheduledRows,
    sentRows,
    visibleRows,
    search,
    searchLoading,
    loading,
    setActiveTab,
    showCampaigns,
    refreshAll,
  } = useDashboard();

  if (!user) return null;

  const emptyTitle = search.trim()
    ? 'No matching emails'
    : dashboardSection === 'attention'
      ? 'No failed deliveries'
      : dashboardSection === 'campaign'
        ? 'No recipients in this campaign'
        : `No ${activeTab} emails yet`;

  const emptyDescription = search.trim()
    ? 'Try searching by recipient address, subject line, or delivery status.'
    : dashboardSection === 'attention'
      ? 'Emails that fail SMTP delivery will appear here with diagnostic details.'
      : dashboardSection === 'campaign'
        ? 'Recipient delivery logs for this campaign will appear here.'
        : 'Schedule a campaign to see live queue updates here.';

  const timeColumnLabel = search.trim()
    ? 'Timestamp'
    : activeTab === 'scheduled' && dashboardSection !== 'attention'
      ? 'Scheduled for'
      : 'Sent at';

  return (
    <div className="space-y-3">
      {dashboardSection === 'campaign' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <button
              type="button"
              onClick={showCampaigns}
              className="inline-flex items-center gap-1.5 font-medium text-zinc-700 hover:text-zinc-900"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Campaigns</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-zinc-900">
              {selectedCampaign?.name || 'Campaign'}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-500 tabular-nums">
            {selectedCampaign?.leads.length || 0} recipients
          </span>
        </div>
      )}

      {dashboardSection !== 'attention' && dashboardSection !== 'campaign' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Email queue filter"
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'scheduled'}
              onClick={() => setActiveTab('scheduled')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                activeTab === 'scheduled'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Scheduled{' '}
              <span className="ml-1 font-mono text-[11px] text-zinc-500 tabular-nums">
                {scheduledRows.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sent'}
              onClick={() => setActiveTab('sent')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                activeTab === 'sent'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {user.simulatedDelivery ? 'Processed' : 'Sent'}{' '}
              <span className="ml-1 font-mono text-[11px] text-zinc-500 tabular-nums">
                {sentRows.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            title="Refresh emails"
            aria-label="Refresh emails"
            aria-busy={loading || searchLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <RefreshCw
              size={13}
              className={loading ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[690px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">{timeColumnLabel}</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {searchLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-zinc-500">
                    <LoaderCircle
                      className="mx-auto mb-2 animate-spin text-[#0f766e]"
                      size={20}
                      aria-hidden="true"
                    />
                    Searching emails…
                  </td>
                </tr>
              ) : loading && !campaigns.length ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-zinc-500">
                    <LoaderCircle
                      className="mx-auto mb-2 animate-spin text-[#0f766e]"
                      size={20}
                      aria-hidden="true"
                    />
                    Loading emails…
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-zinc-900">{row.email}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.name}
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">
                          ({row.senderId})
                        </span>
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top text-sm text-zinc-700">
                      <p className="truncate font-medium text-zinc-800">{row.subject}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-zinc-500 tabular-nums">
                      {formatDate(
                        search.trim()
                          ? row.sentAt || row.scheduledAt
                          : activeTab === 'sent' || dashboardSection === 'attention'
                            ? row.sentAt
                            : row.scheduledAt,
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge status={row.status} />
                      {row.errorMessage && (
                        <p
                          title={row.errorMessage}
                          className={`mt-1.5 text-xs leading-relaxed ${
                            row.status === 'FAILED' ? 'text-rose-700' : 'text-zinc-500'
                          } ${dashboardSection === 'attention' ? 'max-w-md' : 'max-w-[240px] truncate'}`}
                        >
                          {row.errorMessage}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500">
          <span className="tabular-nums">
            {visibleRows.length} {visibleRows.length === 1 ? 'email' : 'emails'}
          </span>
          <span>Auto-refreshes every 5s</span>
        </footer>
      </section>
    </div>
  );
}
