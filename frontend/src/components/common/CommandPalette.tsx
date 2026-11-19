import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BarChart3,
  Clock3,
  Layers,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sun,
} from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { useTheme } from '../../state/useTheme';
import { useToast } from '../../state/useToast';

interface CommandItem {
  id: string;
  section: 'Actions' | 'Views' | 'Campaigns';
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

/**
 * Keyboard-driven Command Palette (`Cmd/Ctrl + K`) for instant navigation and actions.
 */
export function CommandPalette() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const {
    campaigns,
    scheduledRows,
    sentRows,
    failedCount,
    setShowCommandPalette,
    setShowCompose,
    setShowSenders,
    showActivity,
    showCampaigns,
    showAnalytics,
    showAttention,
    showCampaign,
    refreshAll,
    resetDashboard,
    setError,
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = useMemo<CommandItem[]>(() => {
    const close = () => setShowCommandPalette(false);

    const baseItems: CommandItem[] = [
      {
        id: 'action-compose',
        section: 'Actions',
        label: 'Compose new campaign',
        hint: 'C',
        icon: <Plus size={14} aria-hidden="true" />,
        run: () => {
          close();
          setShowCompose(true);
        },
      },
      {
        id: 'action-senders',
        section: 'Actions',
        label: 'Manage SMTP senders',
        icon: <Settings size={14} aria-hidden="true" />,
        run: () => {
          close();
          setShowSenders(true);
        },
      },
      {
        id: 'action-refresh',
        section: 'Actions',
        label: 'Refresh workspace data',
        icon: <RefreshCw size={14} aria-hidden="true" />,
        run: () => {
          close();
          refreshAll();
          pushToast({ title: 'Workspace refreshed', tone: 'info' });
        },
      },
      {
        id: 'action-theme',
        section: 'Actions',
        label: theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode',
        icon:
          theme === 'dark' ? (
            <Sun size={14} aria-hidden="true" />
          ) : (
            <Moon size={14} aria-hidden="true" />
          ),
        run: () => {
          toggleTheme();
          close();
        },
      },
      {
        id: 'action-logout',
        section: 'Actions',
        label: 'Log out',
        icon: <LogOut size={14} aria-hidden="true" />,
        run: () => {
          close();
          void (async () => {
            try {
              await logout();
              resetDashboard();
            } catch (cause) {
              setError(getErrorMessage(cause, 'Could not log out.'));
            }
          })();
        },
      },
      {
        id: 'view-scheduled',
        section: 'Views',
        label: 'Scheduled emails',
        hint: String(scheduledRows.length),
        icon: <Clock3 size={14} aria-hidden="true" />,
        run: () => {
          close();
          showActivity('scheduled');
        },
      },
      {
        id: 'view-sent',
        section: 'Views',
        label: user?.simulatedDelivery ? 'Processed emails' : 'Sent emails',
        hint: String(sentRows.length),
        icon: <Send size={14} aria-hidden="true" />,
        run: () => {
          close();
          showActivity('sent');
        },
      },
      {
        id: 'view-campaigns',
        section: 'Views',
        label: 'Campaigns',
        hint: String(campaigns.length),
        icon: <Layers size={14} aria-hidden="true" />,
        run: () => {
          close();
          showCampaigns();
        },
      },
      {
        id: 'view-analytics',
        section: 'Views',
        label: 'Analytics',
        icon: <BarChart3 size={14} aria-hidden="true" />,
        run: () => {
          close();
          showAnalytics();
        },
      },
      {
        id: 'view-attention',
        section: 'Views',
        label: 'Needs attention',
        hint: String(failedCount),
        icon: <AlertCircle size={14} aria-hidden="true" />,
        run: () => {
          close();
          showAttention();
        },
      },
    ];

    const campaignItems: CommandItem[] = campaigns.slice(0, 8).map((campaign) => ({
      id: `campaign-${campaign.id}`,
      section: 'Campaigns',
      label: campaign.name,
      hint: `${campaign.leads.length} recipients`,
      icon: <Layers size={14} aria-hidden="true" />,
      run: () => {
        close();
        showCampaign(campaign.id);
      },
    }));

    return [...baseItems, ...campaignItems];
  }, [
    campaigns,
    scheduledRows.length,
    sentRows.length,
    failedCount,
    theme,
    user?.simulatedDelivery,
    setShowCommandPalette,
    setShowCompose,
    setShowSenders,
    refreshAll,
    pushToast,
    toggleTheme,
    logout,
    resetDashboard,
    setError,
    showActivity,
    showCampaigns,
    showAnalytics,
    showAttention,
    showCampaign,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.section.toLowerCase().includes(q),
    );
  }, [items, query]);

  const clampedIndex =
    filteredItems.length > 0 ? Math.min(selectedIndex, filteredItems.length - 1) : 0;

  const grouped = useMemo(() => {
    const sections: Array<'Actions' | 'Views' | 'Campaigns'> = ['Actions', 'Views', 'Campaigns'];
    return sections
      .map((section) => ({
        section,
        items: filteredItems.filter((item) => item.section === section),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowCommandPalette(false);
      return;
    }
    if (!filteredItems.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      filteredItems[clampedIndex]?.run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/45 px-4 pt-[12vh] backdrop-blur-[2px] dark:bg-black/65"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowCommandPalette(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#111113]"
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-200 px-3.5 py-2.5 dark:border-zinc-800">
          <Search size={15} className="shrink-0 text-zinc-400" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            aria-label="Type a command or search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, view, or campaign…"
            className="h-7 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />
          <kbd className="kbd-cap">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {grouped.length === 0 ? (
            <p className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No matching commands.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.section} className="mb-2 last:mb-0">
                <p className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {group.section}
                </p>
                {group.items.map((item) => {
                  const flatIndex = filteredItems.indexOf(item);
                  const active = flatIndex === clampedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      onClick={item.run}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                        active
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="text-zinc-500 dark:text-zinc-400">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.hint && (
                        <span className="ml-3 shrink-0 font-mono text-xs text-zinc-400 tabular-nums">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3.5 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          <span>Navigate with ↑↓ · Select with Enter</span>
          <span className="font-mono">⌘K</span>
        </footer>
      </section>
    </div>
  );
}
