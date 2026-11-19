import type { RefObject } from 'react';
import { Command, Menu, MessageCircle, Plus, Search, X } from 'lucide-react';
import { env } from '../../config/env';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';

interface TopHeaderProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Sticky workspace header with mobile nav trigger, `/` search input, `Cmd+K` button, and Slack toggle.
 */
export function TopHeader({ searchInputRef }: TopHeaderProps) {
  const { user, slackBusy, disconnectSlack } = useAuth();
  const {
    search,
    setSearch,
    clearSearch,
    setShowCompose,
    setShowCommandPalette,
    setShowMobileNav,
    setError,
  } = useDashboard();

  if (!user) return null;

  const handleDisconnectSlack = async () => {
    const err = await disconnectSlack();
    if (err) setError(err);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8 dark:border-zinc-800 dark:bg-[#09090b]/95">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileNav(true)}
            aria-label="Open navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Menu size={16} aria-hidden="true" />
          </button>
        </div>

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
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f766e] focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#14b8a6] dark:focus:bg-[#111113]"
          />
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X size={13} aria-hidden="true" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="kbd-cap pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex"
            >
              /
            </kbd>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            aria-label="Open command palette"
            title="Command palette (Ctrl+K / Cmd+K)"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Command size={13} aria-hidden="true" />
            <span className="hidden font-mono text-[11px] sm:inline">⌘K</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCompose(true)}
            aria-label="Compose email"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f766e] px-3 text-xs font-medium text-white hover:bg-[#115e59] lg:hidden dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Compose</span>
          </button>

          {user.slackConnected ? (
            <button
              type="button"
              onClick={() => void handleDisconnectSlack()}
              disabled={slackBusy}
              aria-label="Disconnect Slack"
              title="Disconnect Slack"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:px-3 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <MessageCircle
                size={14}
                className="text-[#0f766e] dark:text-[#14b8a6]"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Slack connected</span>
            </button>
          ) : user.slackConfigured ? (
            <a
              href={`${env.apiUrl}/auth/slack`}
              aria-label="Connect Slack"
              title="Connect Slack"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:px-3 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
              className="hidden h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-400 sm:inline-flex dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500"
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span>Slack unconfigured</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
