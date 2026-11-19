import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Lock, Play, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

type SimStatus = 'PENDING' | 'SENDING' | 'SENT' | 'THROTTLED_DELAYED';

interface SimRow {
  email: string;
  company: string;
  status: SimStatus;
  timestamp: string;
}

const INITIAL_ROWS: SimRow[] = [
  { email: 'maya.chen@acme.example', company: 'Acme Cloud', status: 'PENDING', timestamp: 'Queued' },
  { email: 'devon@northstar.example', company: 'Northstar Ops', status: 'PENDING', timestamp: 'Queued' },
  { email: 'elena@kestrel.example', company: 'Kestrel Labs', status: 'PENDING', timestamp: 'Queued' },
  { email: 'marcus@fieldwork.example', company: 'Fieldwork AI', status: 'PENDING', timestamp: 'Queued' },
  { email: 'priya@vanguard.example', company: 'Vanguard Data', status: 'PENDING', timestamp: 'Queued' },
  { email: 'liam@foundry.example', company: 'Foundry Stack', status: 'PENDING', timestamp: 'Queued' },
];

function formatUtcNow(): string {
  return `${new Date().toISOString().slice(11, 19)} UTC`;
}

/**
 * Interactive queue pacing & hourly rate-limit simulator embedded in the landing hero.
 */
export function QueueSimulator() {
  const [hourlyCap, setHourlyCap] = useState(4);
  const [gapSeconds, setGapSeconds] = useState(0.8);
  const [rows, setRows] = useState<SimRow[]>(INITIAL_ROWS);
  const [running, setRunning] = useState(false);
  const [lockedSender, setLockedSender] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [slackTriggered, setSlackTriggered] = useState(false);
  const [completed, setCompleted] = useState(false);

  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setRows(INITIAL_ROWS);
    setRunning(false);
    setLockedSender(false);
    setSentCount(0);
    setSlackTriggered(false);
    setCompleted(false);
  }, [clearTimers]);

  const runSimulation = () => {
    clearTimers();
    setRows(INITIAL_ROWS);
    setRunning(true);
    setLockedSender(false);
    setSentCount(0);
    setSlackTriggered(false);
    setCompleted(false);

    const gapMs = Math.round(gapSeconds * 1000);
    const sendDurationMs = Math.min(350, Math.round(gapMs * 0.45));

    INITIAL_ROWS.forEach((_, idx) => {
      const startAt = idx * gapMs + 80;
      const t1 = window.setTimeout(() => {
        if (idx < hourlyCap) {
          setLockedSender(true);
          setRows((prev) =>
            prev.map((row, i) =>
              i === idx ? { ...row, status: 'SENDING', timestamp: 'Acquiring lock…' } : row,
            ),
          );

          const t2 = window.setTimeout(() => {
            const stamp = formatUtcNow();
            setRows((prev) =>
              prev.map((row, i) => (i === idx ? { ...row, status: 'SENT', timestamp: stamp } : row)),
            );
            setSentCount(idx + 1);
            setLockedSender(false);
            if (idx + 1 === hourlyCap && hourlyCap < INITIAL_ROWS.length) {
              setSlackTriggered(true);
            }
          }, sendDurationMs);
          timersRef.current.push(t2);
        } else {
          setRows((prev) =>
            prev.map((row, i) =>
              i === idx
                ? { ...row, status: 'THROTTLED_DELAYED', timestamp: 'Next UTC hour' }
                : row,
            ),
          );
        }

        if (idx === INITIAL_ROWS.length - 1) {
          const finishTimer = window.setTimeout(() => {
            setRunning(false);
            setCompleted(true);
          }, sendDurationMs + 120);
          timersRef.current.push(finishTimer);
        }
      }, startAt);

      timersRef.current.push(t1);
    });
  };

  const quotaPct = Math.min(100, Math.round((sentCount / hourlyCap) * 100));

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#111113]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span>Cap</span>
            <select
              aria-label="Hourly sender cap"
              value={hourlyCap}
              disabled={running}
              onChange={(event) => {
                setHourlyCap(Number(event.target.value));
                reset();
              }}
              className="rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-900 focus:border-[#0f766e] focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value={3}>3 / hr</option>
              <option value={4}>4 / hr</option>
              <option value={6}>6 / hr</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span>Gap</span>
            <select
              aria-label="Minimum send spacing"
              value={gapSeconds}
              disabled={running}
              onChange={(event) => {
                setGapSeconds(Number(event.target.value));
                reset();
              }}
              className="rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-900 focus:border-[#0f766e] focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value={0.8}>0.8s</option>
              <option value={1.5}>1.5s</option>
              <option value={2.5}>2.5s</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={running && sentCount === 0}
            aria-label="Reset queue simulation"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={runSimulation}
            disabled={running}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#0f766e] px-3 text-xs font-medium text-white hover:bg-[#115e59] disabled:opacity-60 dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
          >
            <Play size={12} aria-hidden="true" />
            <span>{running ? 'Dispatching…' : 'Dispatch 6 emails'}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 text-xs sm:grid-cols-2 dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex items-center gap-2">
          <Lock
            size={13}
            className={
              lockedSender ? 'text-[#0f766e] dark:text-[#14b8a6]' : 'text-zinc-400'
            }
            aria-hidden="true"
          />
          <span className="text-zinc-500 dark:text-zinc-400">Redis lock:</span>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
            {lockedSender ? 'Locked (sender-1)' : 'Idle'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">UTC quota:</span>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#0f766e] transition-all duration-200 dark:bg-[#14b8a6]"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
          <span className="font-mono font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
            {sentCount}/{hourlyCap}
          </span>
        </div>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows.map((row) => (
          <div
            key={row.email}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{row.email}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.company}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {row.timestamp}
              </span>
              <StatusBadge status={row.status} />
            </div>
          </div>
        ))}
      </div>

      {slackTriggered ? (
        <div
          role="status"
          className="flex items-center justify-between gap-2 border-t border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <Bell size={13} className="shrink-0" aria-hidden="true" />
            <span>
              Slack DM fired: sender hit {hourlyCap}/hr cap — remaining emails moved to next UTC
              hour.
            </span>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-[11px] text-zinc-500 tabular-nums dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
          <span>
            {completed
              ? 'All 6 recipients processed within cap'
              : `Gap: ${gapSeconds.toFixed(1)}s · Lua atomic quota`}
          </span>
          <span>BullMQ + Redis</span>
        </div>
      )}
    </div>
  );
}
