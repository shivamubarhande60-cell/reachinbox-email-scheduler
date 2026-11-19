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
    <div className="py-16 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Mail size={20} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
