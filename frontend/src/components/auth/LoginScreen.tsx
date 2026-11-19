import { MotionConfig, motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { env } from '../../config/env';
import { useAuth } from '../../state/useAuth';
import { AlertBanner } from '../common/AlertBanner';
import { StatusBadge } from '../common/StatusBadge';

const SPECIMEN_ROWS = [
  {
    recipient: 'maya.chen@acme.example',
    campaign: 'Q4 Product Changelog',
    timestamp: '09:00:00 UTC',
    status: 'SENT',
  },
  {
    recipient: 'd.patel@northstar.example',
    campaign: 'Q4 Product Changelog',
    timestamp: '09:00:02 UTC',
    status: 'SENT',
  },
  {
    recipient: 'elena@kestrel.example',
    campaign: 'Q4 Product Changelog',
    timestamp: '09:00:04 UTC',
    status: 'PENDING',
  },
  {
    recipient: 'marcus@fieldwork.example',
    campaign: 'Q4 Product Changelog',
    timestamp: '09:00:06 UTC',
    status: 'THROTTLED_DELAYED',
  },
] as const;

function GoogleLogo() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Asymmetric two-column sign-in view paired with a restrained live-HTML queue specimen.
 */
export function LoginScreen() {
  const { authError, demoEnabled, demoLoading, startDemoLogin } = useAuth();

  return (
    <MotionConfig reducedMotion="user">
      <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(420px,46%)_1fr]">
        <section className="flex flex-col justify-between border-b border-zinc-200 px-6 py-8 sm:px-12 sm:py-10 lg:border-b-0 lg:border-r">
          <div>
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

          <motion.div
            className="mx-auto my-12 w-full max-w-sm lg:my-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-[28px]">
              Sign in to ReachInbox
            </h1>
            <p className="mt-2.5 text-sm leading-6 text-zinc-600">
              Schedule campaigns, throttle sends per SMTP account, and monitor delivery status.
            </p>

            {authError && (
              <div className="mt-5">
                <AlertBanner tone="error">{authError}</AlertBanner>
              </div>
            )}

            <div className="mt-7 space-y-3">
              <a
                className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50"
                href={`${env.apiUrl}/auth/google`}
              >
                <GoogleLogo />
                <span>Continue with Google</span>
              </a>

              {demoEnabled && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void startDemoLogin()}
                    disabled={demoLoading}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {demoLoading ? 'Opening local preview...' : 'Open local preview'}
                  </button>
                  <p className="mt-2 text-xs text-zinc-500">
                    Local-only preview session. Google sign-in remains unchanged.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <p className="text-xs text-zinc-500">
            Private per-account workspace with AES-256-GCM encrypted SMTP credentials.
          </p>
        </section>

        <aside
          aria-label="Queue dispatch preview"
          className="dot-grid-surface flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14"
        >
          <motion.div
            className="mx-auto w-full max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs font-medium text-zinc-700">
                    email-queue
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                    Worker active
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  42 / 200 hourly
                </span>
              </div>

              <div className="divide-y divide-zinc-200">
                {SPECIMEN_ROWS.map((row) => (
                  <div
                    key={row.recipient}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{row.recipient}</p>
                      <p className="truncate text-xs text-zinc-500">{row.campaign}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-500 tabular-nums">
                        {row.timestamp}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-[11px] text-zinc-500 tabular-nums">
                <span>2.0s min spacing</span>
                <span>Idempotent jobs</span>
                <span>Redis + MySQL recovery</span>
              </div>
            </div>
          </motion.div>
        </aside>
      </main>
    </MotionConfig>
  );
}
