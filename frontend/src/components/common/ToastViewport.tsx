import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../../state/useToast';
import type { ToastItem } from '../../types';

const TONE_ICON_STYLE: Record<ToastItem['tone'], string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-[#0f766e] dark:text-[#14b8a6]',
};

/**
 * Fixed bottom-right toast stack with accessible live region and auto-dismissal.
 */
export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 pl-4 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon =
              toast.tone === 'success'
                ? CheckCircle2
                : toast.tone === 'error'
                  ? AlertCircle
                  : Info;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 shadow-lg dark:border-zinc-800 dark:bg-[#111113]"
              >
                <Icon
                  size={16}
                  className={`mt-0.5 shrink-0 ${TONE_ICON_STYLE[toast.tone]}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
