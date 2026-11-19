import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDashboard } from '../../state/useDashboard';
import { SidebarContent } from './SidebarContent';

/**
 * Slide-over navigation drawer for viewports below the `lg` desktop breakpoint.
 */
export function MobileNavDrawer() {
  const { showMobileNav, setShowMobileNav } = useDashboard();

  useEffect(() => {
    if (!showMobileNav) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileNav(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMobileNav, setShowMobileNav]);

  if (!showMobileNav) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-zinc-950/45 backdrop-blur-[2px] lg:hidden dark:bg-black/65"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowMobileNav(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile workspace navigation"
        className="relative flex h-full w-64 flex-col border-r border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-[#111113]"
      >
        <button
          type="button"
          onClick={() => setShowMobileNav(false)}
          aria-label="Close navigation menu"
          className="absolute right-3 top-4 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <SidebarContent onNavigate={() => setShowMobileNav(false)} />
      </div>
    </div>
  );
}
