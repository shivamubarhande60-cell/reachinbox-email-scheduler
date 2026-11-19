import { Clock3, LogOut, Send, Settings } from 'lucide-react';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';

/**
 * Desktop navigation sidebar with user profile, queue filters, and sending limit summary.
 */
export function Sidebar() {
  const { user, logout } = useAuth();
  const {
    activeTab,
    showSenders,
    scheduledRows,
    sentRows,
    senders,
    maxHourlyLimit,
    minimumDelayMs,
    setActiveTab,
    setShowSenders,
    setError,
    resetDashboard,
  } = useDashboard();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      resetDashboard();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not log out.'));
    }
  };

  return (
    <aside className="workspace-sidebar fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-100 px-4 py-6 lg:flex">
      <a
        href="/"
        className="workspace-brand mb-7 flex items-center gap-2 px-2 text-xl font-bold tracking-tight text-slate-950"
      >
        <span className="workspace-brand-mark">
          <Send size={15} />
        </span>
        <span>ReachInbox</span>
      </a>

      <div className="mb-5 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          {user.picture ? (
            <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
              {user.name[0]?.toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-semibold text-slate-800">{user.name}</strong>
            <small className="block truncate text-[10px] text-slate-400">{user.email}</small>
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Log out"
            title="Log out"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Core
      </p>
      <button
        type="button"
        aria-pressed={activeTab === 'scheduled'}
        onClick={() => setActiveTab('scheduled')}
        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
          activeTab === 'scheduled'
            ? 'bg-[#e5f7ed] font-medium text-slate-800'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="flex items-center gap-3">
          <Clock3 size={16} /> Scheduled
        </span>
        <span className="text-xs text-slate-400">{scheduledRows.length}</span>
      </button>

      <button
        type="button"
        aria-pressed={activeTab === 'sent'}
        onClick={() => setActiveTab('sent')}
        className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
          activeTab === 'sent'
            ? 'bg-[#e5f7ed] font-medium text-slate-800'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="flex items-center gap-3">
          <Send size={16} /> Sent
        </span>
        <span className="text-xs text-slate-400">{sentRows.length}</span>
      </button>

      <button
        type="button"
        aria-pressed={showSenders}
        onClick={() => setShowSenders(true)}
        className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
          showSenders
            ? 'bg-[#e5f7ed] font-medium text-slate-800'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="flex items-center gap-3">
          <Settings size={16} /> Senders
        </span>
        <span className="text-xs text-slate-400">{senders.length}</span>
      </button>

      <div className="mt-auto rounded-xl border border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Clock3 size={16} className="text-emerald-600" /> Sending limits
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          At least {Math.ceil(minimumDelayMs / 1000)} sec between emails, up to {maxHourlyLimit} per
          sender each hour.
        </p>
      </div>
    </aside>
  );
}
