import { Plus } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useDashboard } from '../../state/DashboardContext';
import { AlertBanner } from '../common/AlertBanner';
import { Sidebar } from '../layout/Sidebar';
import { TopHeader } from '../layout/TopHeader';
import { ComposeModal } from '../modals/ComposeModal';
import { SenderManagementModal } from '../modals/SenderManagementModal';
import { ActivityOverview } from './ActivityOverview';
import { CampaignsTable } from './CampaignsTable';
import { EmailsTable } from './EmailsTable';

/**
 * Authenticated workspace dashboard composing sidebar, header, overview cards, tables, and modals.
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
    setMessage,
    setError,
  } = useDashboard();

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

  const headingSubtitle =
    dashboardSection === 'campaigns'
      ? 'Select a campaign to see its recipients and delivery status.'
      : dashboardSection === 'campaign'
        ? selectedCampaign?.subject || 'Review every email in this campaign.'
        : dashboardSection === 'attention'
          ? 'Failed emails and delivery errors that may need a retry.'
          : 'Your campaigns, delivery progress, and scheduled messages in one place.';

  return (
    <div className="dashboard-shell min-h-screen text-slate-800">
      <Sidebar />

      <div className="lg:pl-60">
        <TopHeader />

        <main className="workspace-content mx-auto max-w-6xl space-y-5 px-5 py-7 sm:px-10 sm:py-8">
          {user.simulatedDelivery && (
            <AlertBanner tone="info">
              Demo delivery mode is active. Scheduling, queue processing, throttling, and tracking
              work, but email delivery is simulated and no email is sent.
            </AlertBanner>
          )}
          {user.isDemo && (
            <AlertBanner tone="warning">
              Local preview account. Sending is restricted to Ethereal SMTP; Google sign-in is
              unchanged.
            </AlertBanner>
          )}
          {!user.slackConfigured && (
            <p className="text-xs text-slate-500">
              Slack sends you a message when an hourly sending limit is reached. Add Slack app
              credentials to enable it.
            </p>
          )}

          <div className="workspace-title flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">WORKSPACE OVERVIEW</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {headingTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{headingSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="activity-live"
                data-status={activityStatus}
                role="status"
                aria-live="polite"
              >
                <span />
                {activityStatus === 'live'
                  ? 'Live activity'
                  : activityStatus === 'offline'
                    ? 'Connection lost'
                    : 'Connecting…'}
              </span>
              <button
                type="button"
                onClick={() => setShowCompose(true)}
                className="compose-button inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus size={17} /> Compose new email
              </button>
            </div>
          </div>

          <ActivityOverview />

          {message && (
            <AlertBanner tone="success" onDismiss={() => setMessage('')} dismissLabel="Dismiss message">
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
              Connect an SMTP sender to start scheduling emails.
            </AlertBanner>
          )}

          {dashboardSection === 'campaigns' ? <CampaignsTable /> : <EmailsTable />}

          {user.slackConnected && (
            <p className="text-center text-xs text-slate-400">
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
