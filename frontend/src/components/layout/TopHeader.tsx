import { LogOut, MessageCircle, Search, Send, Settings } from 'lucide-react';
import { env } from '../../config/env';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';

/**
 * Sticky top bar with global email search, Slack connection control, and mobile actions.
 */
export function TopHeader() {
  const { user, slackBusy, disconnectSlack, logout } = useAuth();
  const { search, setSearch, setShowSenders, setError, resetDashboard } = useDashboard();

  if (!user) return null;

  const handleDisconnectSlack = async () => {
    const err = await disconnectSlack();
    if (err) setError(err);
  };

  const handleLogout = async () => {
    try {
      await logout();
      resetDashboard();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not log out.'));
    }
  };

  return (
    <header className="workspace-header sticky top-0 z-20 px-5 pt-5 sm:px-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <a
          href="/"
          aria-label="ReachInbox home"
          className="mobile-brand flex shrink-0 items-center gap-2 lg:hidden"
        >
          <span className="workspace-brand-mark">
            <Send size={14} />
          </span>
          <span className="hidden sm:inline">ReachInbox</span>
        </a>

        <label className="relative w-full max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            aria-label="Search emails"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emails"
            className="w-full rounded-full border-0 bg-[#f4f7f5] py-2.5 pl-9 pr-4 text-sm outline-none ring-1 ring-transparent focus:ring-emerald-200"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSenders(true)}
            aria-label="Manage senders"
            title="Manage senders"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3 lg:hidden"
          >
            <Settings size={15} /> <span className="hidden sm:inline">Senders</span>
          </button>

          {user.slackConnected ? (
            <button
              type="button"
              onClick={() => void handleDisconnectSlack()}
              disabled={slackBusy}
              aria-label="Disconnect Slack"
              title="Disconnect Slack"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span className="hidden sm:inline">Slack connected · Disconnect</span>
            </button>
          ) : user.slackConfigured ? (
            <a
              href={`${env.apiUrl}/auth/slack`}
              aria-label="Connect Slack"
              title="Connect Slack"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:px-3"
            >
              <MessageCircle size={15} /> <span className="hidden sm:inline">Connect Slack</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Slack setup required"
              title="Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to backend/.env"
              className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-400 sm:px-3"
            >
              <MessageCircle size={15} />{' '}
              <span className="hidden sm:inline">Slack setup required</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 lg:hidden"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
