import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';
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

  const emptyTitle = search
    ? 'No matching emails'
    : dashboardSection === 'attention'
      ? 'Nothing needs attention'
      : dashboardSection === 'campaign'
        ? 'This campaign has no email records'
        : `No ${activeTab} emails yet`;

  const emptyDescription = search
    ? 'Try a different email address or subject.'
    : dashboardSection === 'attention'
      ? 'Failed deliveries will appear here with their error details.'
      : dashboardSection === 'campaign'
        ? 'Email activity for this campaign will show up here.'
        : 'Your email activity will show up here.';

  return (
    <>
      {dashboardSection === 'campaign' && (
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
          <span className="text-sm text-slate-600">
            {selectedCampaign?.leads.length || 0} emails in this campaign
          </span>
          <button
            type="button"
            onClick={showCampaigns}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Back to campaigns
          </button>
        </div>
      )}

      {dashboardSection !== 'attention' && dashboardSection !== 'campaign' && (
        <div className="workspace-tabs flex flex-col justify-between gap-3 border-b border-slate-100 pb-2 sm:flex-row sm:items-center">
          <div className="flex w-fit rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              aria-pressed={activeTab === 'scheduled'}
              onClick={() => setActiveTab('scheduled')}
              className={`rounded-md px-4 py-2 text-sm ${
                activeTab === 'scheduled'
                  ? 'bg-white font-medium text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Scheduled <span className="ml-1 text-xs text-slate-400">{scheduledRows.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'sent'}
              onClick={() => setActiveTab('sent')}
              className={`rounded-md px-4 py-2 text-sm ${
                activeTab === 'sent'
                  ? 'bg-white font-medium text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {user.simulatedDelivery ? 'Processed' : 'Sent'}{' '}
              <span className="ml-1 text-xs text-slate-400">{sentRows.length}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              title="Refresh emails"
              aria-label="Refresh emails"
              aria-busy={loading || searchLoading}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      <section className="table-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="workspace-table w-full min-w-[690px] text-left">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">
                  {search.trim()
                    ? 'Date'
                    : activeTab === 'scheduled' && dashboardSection !== 'attention'
                      ? 'Scheduled for'
                      : 'Sent at'}
                </th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />
                    Searching emails...
                  </td>
                </tr>
              ) : loading && !campaigns.length ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />
                    Loading emails...
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
                  <tr key={row.id} className="group border-b border-slate-100 hover:bg-[#fbfdfb]">
                    <td className="px-2 py-4 sm:px-3">
                      <p className="text-sm font-medium text-slate-800">To: {row.email}</p>
                      <p className="mt-1 text-xs text-slate-400">{row.name}</p>
                    </td>
                    <td className="max-w-xs truncate px-3 py-4 text-sm text-slate-700">
                      <span className="ml-1 font-medium">{row.subject}</span>
                      <span className="text-slate-400"> - {row.name}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {formatDate(
                        search.trim()
                          ? row.sentAt || row.scheduledAt
                          : activeTab === 'sent' || dashboardSection === 'attention'
                            ? row.sentAt
                            : row.scheduledAt,
                      )}
                    </td>
                    <td className="px-2 py-4 sm:px-3">
                      <StatusBadge status={row.status} />
                      {row.errorMessage && (
                        <p
                          title={row.errorMessage}
                          className="mt-1 max-w-44 truncate text-[11px] text-rose-600"
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
        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          <span>
            {visibleRows.length} {visibleRows.length === 1 ? 'email' : 'emails'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updates every few seconds
          </span>
        </footer>
      </section>
    </>
  );
}
