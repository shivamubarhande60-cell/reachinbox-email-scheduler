import type { ReactNode } from 'react';
import { Mail } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Reusable centered empty-state placeholder for tables and lists.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="px-6 py-14 text-center">
      <div
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500"
        aria-hidden="true"
      >
        <Mail size={18} />
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
