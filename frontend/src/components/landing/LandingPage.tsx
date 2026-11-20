import { useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { Gauge, KeyRound, LoaderCircle, Moon, Play, Send, ShieldCheck, Sun } from 'lucide-react';
import { env } from '../../config/env';
import { useAuth } from '../../state/useAuth';
import { useTheme } from '../../state/useTheme';
import { AlertBanner } from '../common/AlertBanner';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { AuthModal, type AuthModalMode } from './AuthModal';
import { QueueSimulator } from './QueueSimulator';

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

const CAPABILITIES = [
  {
    title: 'Distributed throttling',
    description:
      'Redis-backed sender locks and atomic Lua scripts enforce per-sender and per-campaign hourly caps across worker instances.',
    icon: Gauge,
  },
  {
    title: 'Zero-duplicate crash recovery',
    description:
      'Write-ahead MySQL records, deterministic BullMQ job IDs, and idempotency keys prevent double sends when workers restart.',
    icon: ShieldCheck,
  },
  {
    title: 'Encrypted SMTP vault & search',
    description:
      'Dashboard-managed SMTP passwords and Slack OAuth tokens are encrypted with AES-256-GCM. Email search falls back cleanly to MySQL.',
    icon: KeyRound,
  },
];

/**
 * Interactive startup landing experience with built-in email/password auth modal and 1-click live demo.
 */
export function LandingPage() {
  const { authError, demoEnabled, googleConfigured, demoLoading, startDemoLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#fafafa] text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-[#09090b]/90">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f766e] text-white dark:bg-[#14b8a6] dark:text-zinc-950"
                aria-hidden="true"
              >
                <Send size={13} />
              </span>
              <span>ReachInbox</span>
            </a>

            <nav aria-label="Landing sections" className="hidden items-center gap-6 text-sm md:flex">
              <a
                href="#simulator"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Simulator
              </a>
              <a
                href="#architecture"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Architecture
              </a>
              <a
                href="#capabilities"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Capabilities
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {theme === 'dark' ? (
                  <Sun size={15} aria-hidden="true" />
                ) : (
                  <Moon size={15} aria-hidden="true" />
                )}
              </button>

              {demoEnabled && (
                <button
                  type="button"
                  onClick={() => void startDemoLogin()}
                  disabled={demoLoading}
                  className="hidden h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 sm:inline-flex dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Play size={11} aria-hidden="true" />
                  <span>{demoLoading ? 'Opening…' : 'Live demo'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setAuthModalMode('login')}
                className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                className="inline-flex h-9 items-center rounded-lg bg-[#0f766e] px-3.5 text-xs font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
              >
                Get started
              </button>
            </div>
          </div>
        </header>

        <main>
          <section
            id="simulator"
            className="dot-grid-surface border-b border-zinc-200 py-12 sm:py-16 lg:py-20 dark:border-zinc-800"
          >
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#0f766e] dark:bg-[#14b8a6]"
                    aria-hidden="true"
                  />
                  <span>BullMQ · Redis · MySQL · Multi-SMTP</span>
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-4xl lg:text-[42px] lg:leading-[1.12] dark:text-zinc-100">
                  Email scheduling engineered for deliverability.
                </h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-400">
                  Pace outbound campaigns across verified SMTP senders with atomic hourly rate
                  limits, idempotent queues, and instant search visibility.
                </p>

                {authError && (
                  <div className="mt-5 max-w-md">
                    <AlertBanner tone="error">{authError}</AlertBanner>
                  </div>
                )}

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('register')}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#0f766e] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
                  >
                    Get started free
                  </button>

                  {demoEnabled && (
                    <button
                      type="button"
                      onClick={() => void startDemoLogin()}
                      disabled={demoLoading}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      {demoLoading ? (
                        <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Play size={14} aria-hidden="true" />
                      )}
                      <span>{demoLoading ? 'Opening demo…' : 'Try live demo'}</span>
                    </button>
                  )}

                  {googleConfigured && (
                    <a
                      href={`${env.apiUrl}/auth/google`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      <GoogleLogo />
                      <span>Continue with Google</span>
                    </a>
                  )}
                </div>

                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Create an account in seconds or launch the pre-seeded live demo workspace to test
                  analytics, scheduling, and queue tracking.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                <QueueSimulator />
              </motion.div>
            </div>
          </section>

          <ArchitectureDiagram />

          <section
            id="capabilities"
            className="border-t border-zinc-200 bg-[#fafafa] py-16 sm:py-20 dark:border-zinc-800 dark:bg-[#09090b]"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-3xl dark:text-zinc-100">
                  Designed for sender reputation and operational clarity.
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Every control in ReachInbox maps directly to background worker behavior so teams
                  always know what is queued, throttled, or delivered.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {CAPABILITIES.map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <div
                      key={cap.title}
                      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#111113]"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[#0f766e] dark:border-zinc-800 dark:bg-zinc-900 dark:text-[#14b8a6]"
                        aria-hidden="true"
                      >
                        <Icon size={17} />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {cap.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {cap.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-t border-zinc-200 bg-white py-14 dark:border-zinc-800 dark:bg-[#111113]">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-8">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
                  Ready to schedule your next campaign?
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Create your free workspace or explore the live demo dashboard immediately.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {demoEnabled && (
                  <button
                    type="button"
                    onClick={() => void startDemoLogin()}
                    disabled={demoLoading}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Play size={14} aria-hidden="true" />
                    <span>{demoLoading ? 'Opening…' : 'Try live demo'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAuthModalMode('register')}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
                >
                  <span>Create free account</span>
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-zinc-200 bg-[#fafafa] py-6 dark:border-zinc-800 dark:bg-[#09090b]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-zinc-500 sm:px-8 dark:text-zinc-400">
            <span>ReachInbox Email Scheduler</span>
            <span className="font-mono">Express · BullMQ · Redis · MySQL · React</span>
          </div>
        </footer>

        {authModalMode && (
          <AuthModal initialMode={authModalMode} onClose={() => setAuthModalMode(null)} />
        )}
      </div>
    </MotionConfig>
  );
}
