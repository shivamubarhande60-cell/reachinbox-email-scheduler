import {
  AlertCircle,
  BarChart3,
  Clock3,
  Layers,
  LogOut,
  Moon,
  Plus,
  Send,
  Settings,
  Sun,
} from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { useTheme } from '../../state/useTheme';

interface SidebarContentProps {
  onNavigate?: () => void;
}

/**
 * Shared navigation content used by both the desktop fixed sidebar and mobile drawer.
 */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    showAnalytics,
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
  const isAnalyticsActive = dashboardSection === 'analytics';
  const isAttentionActive = dashboardSection === 'attention';

  const handleLogout = async () => {
    onNavigate?.();
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
        ? 'bg-zinc-200/80 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
    }`;

  return (
    <div className="flex h-full flex-col px-3.5 py-5">
      <div className="mb-4 px-1.5">
        <a
          href="/"
          onClick={onNavigate}
          className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f766e] text-white dark:bg-[#14b8a6] dark:text-zinc-950"
            aria-hidden="true"
          >
            <Send size={14} />
          </span>
          <span>ReachInbox</span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          setShowCompose(true);
        }}
        className="mb-5 flex w-full items-center justify-between rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={15} aria-hidden="true" />
          <span>Compose email</span>
        </span>
        <kbd className="hidden rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90 sm:inline-flex dark:border-zinc-950/20 dark:bg-zinc-950/10 dark:text-zinc-950">
          C
        </kbd>
      </button>

      <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <p className="mb-1.5 px-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Views
          </p>
          <div className="space-y-0.5">
            <button
              type="button"
              aria-current={isScheduledActive ? 'page' : undefined}
              onClick={() => {
                showActivity('scheduled');
                onNavigate?.();
              }}
              className={navItemClass(isScheduledActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Clock3 size={15} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span>Scheduled</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {scheduledRows.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isSentActive ? 'page' : undefined}
              onClick={() => {
                showActivity('sent');
                onNavigate?.();
              }}
              className={navItemClass(isSentActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Send size={15} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span>{user.simulatedDelivery ? 'Processed' : 'Sent'}</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {sentRows.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isCampaignsActive ? 'page' : undefined}
              onClick={() => {
                showCampaigns();
                onNavigate?.();
              }}
              className={navItemClass(isCampaignsActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <Layers size={15} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span>Campaigns</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {campaigns.length}
              </span>
            </button>

            <button
              type="button"
              aria-current={isAnalyticsActive ? 'page' : undefined}
              onClick={() => {
                showAnalytics();
                onNavigate?.();
              }}
              className={navItemClass(isAnalyticsActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <BarChart3
                  size={15}
                  className="text-zinc-500 dark:text-zinc-400"
                  aria-hidden="true"
                />
                <span>Analytics</span>
              </span>
            </button>

            <button
              type="button"
              aria-current={isAttentionActive ? 'page' : undefined}
              onClick={() => {
                showAttention();
                onNavigate?.();
              }}
              className={navItemClass(isAttentionActive)}
            >
              <span className="inline-flex items-center gap-2.5">
                <AlertCircle
                  size={15}
                  className={
                    failedCount > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }
                  aria-hidden="true"
                />
                <span>Needs attention</span>
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  failedCount > 0
                    ? 'font-medium text-rose-600 dark:text-rose-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {failedCount}
              </span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Configuration
          </p>
          <button
            type="button"
            aria-pressed={showSenders}
            onClick={() => {
              onNavigate?.();
              setShowSenders(true);
            }}
            className={navItemClass(showSenders)}
          >
            <span className="inline-flex items-center gap-2.5">
              <Settings size={15} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
              <span>Email senders</span>
            </span>
            <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {senders.length}
            </span>
          </button>
        </div>
      </nav>

      <div className="mt-4 space-y-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span className="inline-flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun size={14} aria-hidden="true" />
            ) : (
              <Moon size={14} aria-hidden="true" />
            )}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-400">{theme}</span>
        </button>

        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Sending guardrails</p>
          <p className="mt-1 font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {maxHourlyLimit}/hr · {Math.ceil(minimumDelayMs / 1000)}s gap
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
          {user.picture ? (
            <img src={user.picture} alt="" className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {user.name[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Log out"
            title="Log out"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
