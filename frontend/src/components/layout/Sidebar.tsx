import { AlertCircle, Clock3, Layers, LogOut, Plus, Send, Settings } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';

/**
 * Desktop navigation sidebar with primary compose CTA, views, guardrails, and account footer.
 */
export function Sidebar() {
  const { user, logout } = useAuth();
  const {
    activeTab,
    dashboardSection,
    search,
    showSenders,
    scheduledRows,
    sentRows,
    campaigns,
    failedCount,
    senders,
    maxHourlyLimit,
    minimumDelayMs,
    showActivity,
    showCampaigns,
    showAttention,
    setShowCompose,
    setShowSenders,
    setError,
    resetDashboard,
  } = useDashboard();

  if (!user) return null;

  const hasSearch = Boolean(search.trim());
  const isScheduledActive =
    dashboardSection === 'activity' && activeTab === 'scheduled' && !hasSearch;
  const isSentActive = dashboardSection === 'activity' && activeTab === 'sent' && !hasSearch;
  const isCampaignsActive = dashboardSection === 'campaigns' || dashboardSection === 'campaign';
  const isAttentionActive = dashboardSection === 'attention';

  const handleLogout = async () => {
    try {
      await logout();
      resetDashboard();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not log out.'));
    }
  };

  const navItemClass = (active: boolean) =>
    `flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm ${
      active
        ? 'bg-zinc-200/70 font-medium text-zinc-900'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
    }`;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-zinc-200 bg-zinc-50/80 px-3.5 py-5 lg:flex">
      <div className="mb-4 px-1.5">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-900"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f766e] text-white"
            aria-hidden="true"
          >
            <Send size={14} />
          </span>
          <span>ReachInbox</span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => setShowCompose(true)}
        className="mb-5 flex w-full items-center justify-between rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-[#115e59]"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={15} aria-hidden="true" />
          <span>Compose email</span>
        </span>
        <kbd className="hidden rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90 sm:inline-flex">
          C
        </kbd>
      </button>

      <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <p className="mb-1.5 px-2.5 text-xs font-medium text-zinc-500">Views</p>
          <div className="space-y-0.5">
            <button
              type="button"
              aria-current={isScheduledActive ? 'page' : undefined}
              onClick={() => showActivity('scheduled')}
              className={navItemClass(isScheduledActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Clock3 size={15} className="text-zinc-500" aria-hidden="true" />
                <span>Scheduled</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                {scheduledRows.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isSentActive ? 'page' : undefined}
              onClick={() => showActivity('sent')}
              className={navItemClass(isSentActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Send size={15} className="text-zinc-500" aria-hidden="true" />
                <span>{user.simulatedDelivery ? 'Processed' : 'Sent'}</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                {sentRows.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isCampaignsActive ? 'page' : undefined}
              onClick={showCampaigns}
              className={navItemClass(isCampaignsActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Layers size={15} className="text-zinc-500" aria-hidden="true" />
                <span>Campaigns</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                {campaigns.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isAttentionActive ? 'page' : undefined}
              onClick={showAttention}
              className={navItemClass(isAttentionActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <AlertCircle
                  size={15}
                  className={failedCount > 0 ? 'text-rose-600' : 'text-zinc-500'}
                  aria-hidden="true"
                />
                <span>Needs attention</span>
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  failedCount > 0 ? 'font-medium text-rose-600' : 'text-zinc-500'
                }`}
              >
                {failedCount}
              </span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-2.5 text-xs font-medium text-zinc-500">Configuration</p>
          <button
            type="button"
            aria-pressed={showSenders}
            onClick={() => setShowSenders(true)}
            className={navItemClass(showSenders)}
          >
            <span className="inline-flex items-center gap-2.5">
              <Settings size={15} className="text-zinc-500" aria-hidden="true" />
              <span>SMTP senders</span>
            </span>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">{senders.length}</span>
          </button>
        </div>
      </nav>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-medium text-zinc-700">Sending guardrails</p>
          <p className="mt-1 font-mono text-xs text-zinc-500 tabular-nums">
            {maxHourlyLimit}/hr · {Math.ceil(minimumDelayMs / 1000)}s gap
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white p-2">
          {user.picture ? (
            <img src={user.picture} alt="" className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700">
              {user.name[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-900">{user.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Log out"
            title="Log out"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
