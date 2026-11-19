import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../state/useAuth';
import { useDashboard } from '../../state/useDashboard';
import { AlertBanner } from '../common/AlertBanner';
import { Sidebar } from '../layout/Sidebar';
import { TopHeader } from '../layout/TopHeader';
import { ComposeModal } from '../modals/ComposeModal';
import { SenderManagementModal } from '../modals/SenderManagementModal';
import { ActivityOverview } from './ActivityOverview';
import { CampaignsTable } from './CampaignsTable';
import { EmailsTable } from './EmailsTable';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Authenticated workspace dashboard composing sidebar, header, metric strip, tables, and modals.
 */
export function DashboardView() {
  const { user } = useAuth();
  const {
    dashboardSection,
    selectedCampaign,
    activeTab,
    search,
    activityStatus,
    senders,
    message,
    error,
    showCompose,
    showSenders,
    setShowCompose,
    setShowSenders,
    setMessage,
    setError,
  } = useDashboard();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (showCompose || showSenders) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setShowCompose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCompose, showSenders, setShowCompose]);

  if (!user) return null;

  const headingTitle = search.trim()
    ? 'Search results'
    : dashboardSection === 'campaigns'
      ? 'Campaigns'
      : dashboardSection === 'campaign'
        ? selectedCampaign?.name || 'Campaign details'
        : dashboardSection === 'attention'
          ? 'Needs attention'
          : activeTab === 'scheduled'
            ? 'Scheduled emails'
            : user.simulatedDelivery
              ? 'Processed emails'
              : 'Sent emails';

  const headingSubtitle = search.trim()
    ? `Showing matches for "${search.trim()}"`
    : dashboardSection === 'campaigns'
      ? 'Select a campaign to inspect individual recipients and delivery status.'
      : dashboardSection === 'campaign'
        ? selectedCampaign?.subject || 'Review every email queued in this campaign.'
        : dashboardSection === 'attention'
          ? 'Failed deliveries and SMTP errors requiring inspection.'
          : 'Monitor queued deliveries, campaign pacing, and sender throughput.';

  const statusDotClass =
    activityStatus === 'live'
      ? 'bg-emerald-600'
      : activityStatus === 'offline'
        ? 'bg-rose-600'
        : 'bg-zinc-400';

  const statusLabel =
    activityStatus === 'live'
      ? 'Live'
      : activityStatus === 'offline'
        ? 'Offline'
        : 'Connecting';

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <div className="lg:pl-60">
        <TopHeader searchInputRef={searchInputRef} />

        <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8 sm:py-8">
          {user.simulatedDelivery && (
            <AlertBanner tone="info">
              Demo delivery mode is active. Queueing, throttling, and tracking run normally, while
              SMTP sends are simulated.
            </AlertBanner>
          )}
          {user.isDemo && (
            <AlertBanner tone="warning">
              Local preview session. SMTP sending is restricted to Ethereal; Google sign-in is
              unchanged.
            </AlertBanner>
          )}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.025em] text-zinc-900">
                {headingTitle}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">{headingSubtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} aria-hidden="true" />
                <span>{statusLabel}</span>
              </span>

              <button
                type="button"
                onClick={() => setShowCompose(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#115e59]"
              >
                <Plus size={15} aria-hidden="true" />
                <span>Compose email</span>
              </button>
            </div>
          </div>

          <ActivityOverview />

          {message && (
            <AlertBanner
              tone="success"
              onDismiss={() => setMessage('')}
              dismissLabel="Dismiss message"
            >
              {message}
            </AlertBanner>
          )}
          {error && (
            <AlertBanner tone="error" onDismiss={() => setError('')} dismissLabel="Dismiss error">
              {error}
            </AlertBanner>
          )}
          {senders.length === 0 && (
            <AlertBanner tone="warning">
              <span>
                No SMTP sender configured.{' '}
                <button
                  type="button"
                  onClick={() => setShowSenders(true)}
                  className="font-medium underline underline-offset-2 hover:text-amber-950"
                >
                  Connect a sender
                </button>{' '}
                to schedule emails.
              </span>
            </AlertBanner>
          )}

          {dashboardSection === 'campaigns' ? <CampaignsTable /> : <EmailsTable />}

          {user.slackConnected && (
            <p className="text-center text-xs text-zinc-500">
              Slack is connected for hourly rate-limit alerts.
            </p>
          )}
        </main>
      </div>

      {showCompose && <ComposeModal />}
      {showSenders && <SenderManagementModal />}
    </div>
  );
}
