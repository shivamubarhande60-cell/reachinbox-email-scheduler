import type { ReactNode } from 'react';

interface ModalProps {
  titleId: string;
  busy?: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Accessible modal backdrop and centered dialog container.
 */
export function Modal({
  titleId,
  busy = false,
  onClose,
  maxWidthClass = 'max-w-3xl',
  children,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto w-full ${maxWidthClass} rounded-2xl bg-white shadow-2xl`}
      >
        {children}
      </section>
    </div>
  );
}
