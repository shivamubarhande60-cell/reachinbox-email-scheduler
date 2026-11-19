import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  titleId: string;
  busy?: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Accessible modal backdrop and centered dialog container with Escape-key dismissal.
 */
export function Modal({
  titleId,
  busy = false,
  onClose,
  maxWidthClass = 'max-w-3xl',
  children,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/45 p-4 backdrop-blur-[2px] dark:bg-black/65"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto w-full ${maxWidthClass} rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-[#111113]`}
      >
        {children}
      </section>
    </div>
  );
}
