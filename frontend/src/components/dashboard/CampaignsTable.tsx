import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../common/EmptyState';

/**
 * Displays all user campaigns with stacked progress bars and drill-down selection.
 */
export function CampaignsTable() {
  const { user } = useAuth();
  const { campaigns, loading, showCampaign, setShowCompose } = useDashboard();

  if (!user) return null;

  return (
    <section
      aria-label="Campaign list"
      className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111113]"
    >
      {loading && campaigns.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <LoaderCircle
            className="mx-auto mb-2 animate-spin text-[#0f766e] dark:text-[#14b8a6]"
            size={20}
            aria-hidden="true"
          />
          Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Compose a campaign to schedule and track email deliveries."
          action={
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-lg bg-[#0f766e] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
            >
              Compose email
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                <th className="px-4 py-2.5">Campaign</th>
                <th className="px-4 py-2.5">Sender</th>
                <th className="px-4 py-2.5">Recipients</th>
                <th className="px-4 py-2.5">Delivery progress</th>
                <th className="px-4 py-2.5 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {campaigns.map((campaign) => {
                const total = campaign.leads.length;
                const campaignSent = campaign.leads.filter(
                  (lead) => lead.status === 'SENT' || lead.status === 'SIMULATED',
                ).length;
                const campaignFailed = campaign.leads.filter(
                  (lead) => lead.status === 'FAILED',
                ).length;
                const campaignScheduled = campaign.leads.filter(
                  (lead) => lead.status === 'PENDING' || lead.status === 'THROTTLED_DELAYED',
                ).length;

                const sentPct = total ? (campaignSent / total) * 100 : 0;
                const scheduledPct = total ? (campaignScheduled / total) * 100 : 0;
                const failedPct = total ? (campaignFailed / total) * 100 : 0;

                return (
                  <tr
                    key={campaign.id}
                    onClick={() => showCampaign(campaign.id)}
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          showCampaign(campaign.id);
                        }}
                        className="block w-full text-left"
                      >
                        <span className="block truncate text-sm font-medium text-zinc-900 group-hover:text-[#0f766e] dark:text-zinc-100 dark:group-hover:text-[#14b8a6]">
                          {campaign.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {campaign.subject}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {campaign.senderId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 tabular-nums dark:text-zinc-300">
                      {total}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                          aria-hidden="true"
                        >
                          {sentPct > 0 && (
                            <span
                              className="bg-[#0f766e] dark:bg-[#14b8a6]"
                              style={{ width: `${sentPct}%` }}
                            />
                          )}
                          {scheduledPct > 0 && (
                            <span
                              className="bg-amber-400 dark:bg-amber-500"
                              style={{ width: `${scheduledPct}%` }}
                            />
                          )}
                          {failedPct > 0 && (
                            <span
                              className="bg-rose-600 dark:bg-rose-500"
                              style={{ width: `${failedPct}%` }}
                            />
                          )}
                        </div>
                        <span className="text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
                          {campaignSent} {user.simulatedDelivery ? 'processed' : 'sent'}
                          {campaignScheduled > 0 ? ` · ${campaignScheduled} queued` : ''}
                          {campaignFailed > 0 ? ` · ${campaignFailed} failed` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{formatDate(campaign.createdAt)}</span>
                        <ChevronRight
                          size={14}
                          className="text-zinc-400 opacity-0 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
        <span className="tabular-nums">
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
        </span>
        <span>Select a row to inspect recipients</span>
      </footer>
    </section>
  );
}
