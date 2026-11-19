import type { RefObject } from 'react';
import { LogOut, MessageCircle, Plus, Search, Send, Settings, X } from 'lucide-react';
import { env } from '../../config/env';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';

interface TopHeaderProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Sticky top bar with global email search, Slack alert toggle, and responsive workspace actions.
 */
export function TopHeader({ searchInputRef }: TopHeaderProps) {
  const { user, slackBusy, disconnectSlack, logout } = useAuth();
  const { search, setSearch, clearSearch, setShowCompose, setShowSenders, setError, resetDashboard } =
    useDashboard();

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
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <a
          href="/"
          aria-label="ReachInbox home"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 lg:hidden"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f766e] text-white"
            aria-hidden="true"
          >
            <Send size={13} />
          </span>
          <span className="hidden sm:inline">ReachInbox</span>
        </a>

        <div className="relative w-full max-w-md">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            aria-label="Search emails"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipients or subjects…"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-14 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f766e] focus:bg-white focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700"
            >
              <X size={13} aria-hidden="true" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="kbd-cap pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex"
            >
              /
            </kbd>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            aria-label="Compose email"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f766e] px-3 text-xs font-medium text-white hover:bg-[#115e59] lg:hidden"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Compose</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSenders(true)}
            aria-label="Manage SMTP senders"
            title="Manage SMTP senders"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:px-3 lg:hidden"
          >
            <Settings size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Senders</span>
          </button>

          {user.slackConnected ? (
            <button
              type="button"
              onClick={() => void handleDisconnectSlack()}
              disabled={slackBusy}
              aria-label="Disconnect Slack"
              title="Disconnect Slack"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:px-3"
            >
              <MessageCircle size={14} className="text-[#0f766e]" aria-hidden="true" />
              <span className="hidden sm:inline">Slack connected · Disconnect</span>
            </button>
          ) : user.slackConfigured ? (
            <a
              href={`${env.apiUrl}/auth/slack`}
              aria-label="Connect Slack"
              title="Connect Slack"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:px-3"
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Connect Slack</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Slack setup required"
              title="Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to backend environment"
              className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-400 sm:px-3"
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Slack unconfigured</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Log out"
            title="Log out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 lg:hidden"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
