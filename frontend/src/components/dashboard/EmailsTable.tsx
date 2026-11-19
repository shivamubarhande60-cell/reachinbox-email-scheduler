import { ArrowLeft, ArrowUpDown, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

/**
 * Displays scheduled, sent, failed, campaign-specific, or search-filtered email rows with inspector drawer trigger.
 */
export function EmailsTable() {
  const { user } = useAuth();
  const {
    campaigns,
    senders,
    dashboardSection,
    selectedCampaign,
    activeTab,
    scheduledRows,
    sentRows,
    visibleRows,
    search,
    searchLoading,
    statusFilter,
    senderFilter,
    sortOrder,
    loading,
    setActiveTab,
    setSelectedEmail,
    setStatusFilter,
    setSenderFilter,
    setSortOrder,
    showCampaigns,
    refreshAll,
  } = useDashboard();

  if (!user) return null;

  const hasFilters = statusFilter !== 'ALL' || senderFilter !== 'ALL';

  const emptyTitle = hasFilters
    ? 'No matching records for active filters'
    : search.trim()
      ? 'No matching emails'
      : dashboardSection === 'attention'
        ? 'No failed deliveries'
        : dashboardSection === 'campaign'
          ? 'No recipients in this campaign'
          : `No ${activeTab} emails yet`;

  const emptyDescription = hasFilters
    ? 'Reset the status or sender filter to inspect all records in this view.'
    : search.trim()
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

  const uniqueSenderIds = [...new Set([...senders.map((s) => s.id), ...campaigns.map((c) => c.senderId)])];

  return (
    <div className="space-y-3">
      {dashboardSection === 'campaign' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-[#111113]">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={showCampaigns}
              className="inline-flex items-center gap-1.5 font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Campaigns</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {selectedCampaign?.name || 'Campaign'}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {selectedCampaign?.leads.length || 0} recipients
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {dashboardSection !== 'attention' && dashboardSection !== 'campaign' ? (
          <div
            role="tablist"
            aria-label="Email queue filter"
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'scheduled'}
              onClick={() => setActiveTab('scheduled')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                activeTab === 'scheduled'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Scheduled{' '}
              <span className="ml-1 font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
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
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {user.simulatedDelivery ? 'Processed' : 'Sent'}{' '}
              <span className="ml-1 font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                {sentRows.length}
              </span>
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 focus:border-[#0f766e] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Scheduled</option>
            <option value="THROTTLED_DELAYED">Queued for later</option>
            <option value="SENT">Sent</option>
            <option value="SIMULATED">Simulated</option>
            <option value="FAILED">Failed</option>
          </select>

          {uniqueSenderIds.length > 0 && (
            <select
              aria-label="Filter by sender"
              value={senderFilter}
              onChange={(event) => setSenderFilter(event.target.value)}
              className="h-8 max-w-[160px] rounded-lg border border-zinc-200 bg-white px-2.5 font-mono text-xs text-zinc-700 focus:border-[#0f766e] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="ALL">All senders</option>
              {uniqueSenderIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            aria-label={`Sort order: ${sortOrder}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowUpDown size={12} aria-hidden="true" />
            <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>

          <button
            type="button"
            onClick={refreshAll}
            title="Refresh emails"
            aria-label="Refresh emails"
            aria-busy={loading || searchLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">{timeColumnLabel}</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="w-10 px-3 py-2.5 text-right">
                  <span className="sr-only">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {searchLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    <LoaderCircle
                      className="mx-auto mb-2 animate-spin text-[#0f766e] dark:text-[#14b8a6]"
                      size={20}
                      aria-hidden="true"
                    />
                    Searching emails…
                  </td>
                </tr>
              ) : loading && !campaigns.length ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    <LoaderCircle
                      className="mx-auto mb-2 animate-spin text-[#0f766e] dark:text-[#14b8a6]"
                      size={20}
                      aria-hidden="true"
                    />
                    Loading emails…
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      action={
                        hasFilters ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('ALL');
                              setSenderFilter('ALL');
                            }}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                          >
                            Reset filters
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedEmail(row)}
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-zinc-900 group-hover:text-[#0f766e] dark:text-zinc-100 dark:group-hover:text-[#14b8a6]">
                        {row.email}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {row.name}
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">
                          ({row.senderId})
                        </span>
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top text-sm text-zinc-700 dark:text-zinc-300">
                      <p className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {row.subject}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
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
                            row.status === 'FAILED'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          } ${dashboardSection === 'attention' ? 'max-w-md' : 'max-w-[240px] truncate'}`}
                        >
                          {row.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right align-middle">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedEmail(row);
                        }}
                        aria-label={`Inspect email to ${row.email}`}
                        className="rounded p-1 text-zinc-400 opacity-60 group-hover:bg-zinc-200/70 group-hover:text-zinc-800 group-hover:opacity-100 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-200"
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
          <span className="tabular-nums">
            {visibleRows.length} {visibleRows.length === 1 ? 'email' : 'emails'}
          </span>
          <span>Click any row to inspect · Auto-refreshes every 5s</span>
        </footer>
      </section>
    </div>
  );
}
