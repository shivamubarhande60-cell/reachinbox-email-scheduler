import { useState } from 'react';
import { Database, Gauge, KeyRound, MailCheck, ShieldCheck } from 'lucide-react';

interface PipelineStage {
  id: string;
  title: string;
  tech: string;
  summary: string;
  guarantees: string[];
  icon: typeof KeyRound;
}

const STAGES: PipelineStage[] = [
  {
    id: 'idempotency',
    title: 'API + Idempotency',
    tech: 'Express · Idempotency-Key',
    summary:
      'Every schedule request validates recipients, enforces per-sender rate limits, and stores a unique idempotency key before touching the queue.',
    guarantees: [
      'Deduplicates recipient lists up to 10,000 leads per batch',
      'Prevents double campaign creation on network retries',
      'Signed HttpOnly session cookies for workspace isolation',
    ],
    icon: KeyRound,
  },
  {
    id: 'mysql',
    title: 'MySQL Write-Ahead',
    tech: 'Prisma · MySQL 8',
    summary:
      'Campaigns and recipient records are committed to MySQL first so startup recovery can reconcile any job interrupted before queueing.',
    guarantees: [
      'Durable source of truth across container restarts',
      'Encrypted managed SMTP credentials (AES-256-GCM)',
      'Automatic startup recovery re-enqueues pending leads',
    ],
    icon: Database,
  },
  {
    id: 'bullmq',
    title: 'BullMQ Delayed Queue',
    tech: 'BullMQ · Redis AOF',
    summary:
      'Each recipient receives a deterministic delayed job ID (`email-${leadId}`) rather than polling cron loops.',
    guarantees: [
      'Exact millisecond delay scheduling from campaign start time',
      'Separate `email-index-queue` isolates search outages',
      'Graceful SIGTERM worker draining before process exit',
    ],
    icon: ShieldCheck,
  },
  {
    id: 'limiter',
    title: 'Redis Lua Limiter',
    tech: 'IORedis · Atomic Lua',
    summary:
      'Distributed sender locks serialize sends per SMTP account while an atomic Lua script enforces both sender and campaign hourly caps.',
    guarantees: [
      'Zero race conditions across concurrent worker instances',
      'Excess jobs move cleanly to the next UTC hour window',
      'One-per-hour Slack DM alert when hourly limit is reached',
    ],
    icon: Gauge,
  },
  {
    id: 'delivery',
    title: 'SMTP + Search + Slack',
    tech: 'Nodemailer · Elasticsearch',
    summary:
      'Pooled SMTP transporters deliver messages safely without blindly retrying uncertain SMTP outcomes, then index records asynchronously.',
    guarantees: [
      '4xx temporary errors retry; uncertain outcomes halt safely',
      'Automatic MySQL search fallback if Elasticsearch is offline',
      'Demo simulation mode for safe staging environments',
    ],
    icon: MailCheck,
  },
];

/**
 * Interactive 5-stage system architecture explorer showing ReachInbox's delivery guarantees.
 */
export function ArchitectureDiagram() {
  const [activeId, setActiveId] = useState<string>(STAGES[0].id);
  const activeStage = STAGES.find((stage) => stage.id === activeId) ?? STAGES[0];
  const ActiveIcon = activeStage.icon;

  return (
    <section
      id="architecture"
      className="border-t border-zinc-200 bg-white py-16 sm:py-20 dark:border-zinc-800 dark:bg-[#111113]"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-3xl dark:text-zinc-100">
            Built like production infrastructure, not a cron script.
          </h2>
          <p className="mt-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Inspect each stage of the scheduling pipeline. Every transition between MySQL, Redis,
            BullMQ, and SMTP is designed to prevent duplicate sends and survive restarts.
          </p>
        </div>

        <div className="mt-8 grid gap-2 lg:grid-cols-5">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const selected = stage.id === activeId;
            return (
              <div key={stage.id} className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveId(stage.id)}
                  aria-pressed={selected}
                  className={`flex w-full flex-col items-start rounded-lg border p-3.5 text-left ${
                    selected
                      ? 'border-[#0f766e] bg-[#0f766e]/5 dark:border-[#14b8a6] dark:bg-[#14b8a6]/10'
                      : 'border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                        selected
                          ? 'border-[#0f766e]/30 bg-[#0f766e] text-white dark:border-[#14b8a6]/30 dark:bg-[#14b8a6] dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400'
                      }`}
                      aria-hidden="true"
                    >
                      <Icon size={14} />
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                      0{idx + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {stage.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {stage.tech}
                  </p>
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-[#fafafa] p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#09090b]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden bg-zinc-200 dark:bg-zinc-800"
            aria-hidden="true"
          >
            <div className="animate-pulse-travel h-full w-1/3 bg-gradient-to-r from-transparent via-[#0f766e] to-transparent dark:via-[#14b8a6]" />
          </div>

          <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <ActiveIcon
                  size={13}
                  className="text-[#0f766e] dark:text-[#14b8a6]"
                  aria-hidden="true"
                />
                <span>{activeStage.tech}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {activeStage.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {activeStage.summary}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#111113]">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Runtime guarantees
              </p>
              <ul className="mt-2.5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {activeStage.guarantees.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f766e] dark:bg-[#14b8a6]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
