import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../common/EmptyState';

/**
 * Displays all user campaigns with aggregate delivery progress and drill-down selection.
 */
export function CampaignsTable() {
  const { user } = useAuth();
  const { campaigns, loading, showCampaign, setShowCompose } = useDashboard();

  if (!user) return null;

  return (
    <section aria-label="Campaign list" className="table-card overflow-hidden bg-white">
      {loading && campaigns.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">
          <LoaderCircle className="mx-auto mb-2 animate-spin" size={21} />
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Compose an email to create your first campaign."
          action={
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Compose email
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="workspace-table w-full min-w-[690px] text-left">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Campaign</th>
                <th className="px-5 py-3.5">Sender</th>
                <th className="px-5 py-3.5">Recipients</th>
                <th className="px-5 py-3.5">Progress</th>
                <th className="px-5 py-3.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => {
                const campaignSent = campaign.leads.filter(
                  (lead) => lead.status === 'SENT' || lead.status === 'SIMULATED',
                ).length;
                const campaignFailed = campaign.leads.filter(
                  (lead) => lead.status === 'FAILED',
                ).length;
                const campaignScheduled = campaign.leads.filter(
                  (lead) => lead.status === 'PENDING' || lead.status === 'THROTTLED_DELAYED',
                ).length;

                return (
                  <tr key={campaign.id} className="hover:bg-[#fbfdfb]">
                    <td colSpan={5} className="p-0">
                      <button
                        type="button"
                        onClick={() => showCampaign(campaign.id)}
                        className="grid w-full grid-cols-5 items-center text-left focus-visible:outline-emerald-500"
                      >
                        <span className="min-w-0 px-5 py-4">
                          <strong className="block truncate text-sm font-medium text-slate-800">
                            {campaign.name}
                          </strong>
                          <small className="mt-1 block truncate text-xs text-slate-400">
                            {campaign.subject}
                          </small>
                        </span>
                        <span className="truncate px-3 py-4 text-sm text-slate-600">
                          {campaign.senderId}
                        </span>
                        <span className="px-3 py-4 text-sm text-slate-600">
                          {campaign.leads.length}
                        </span>
                        <span className="px-3 py-4 text-xs text-slate-500">
                          {campaignSent} {user.simulatedDelivery ? 'processed' : 'sent'} ·{' '}
                          {campaignScheduled} scheduled
                          {campaignFailed ? ` · ${campaignFailed} failed` : ''}
                        </span>
                        <span className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(campaign.createdAt)}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        <span>
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
        </span>
        <span>Select a campaign to view its emails</span>
      </footer>
    </section>
  );
}
