import { SidebarContent } from './SidebarContent';

/**
 * Fixed desktop left rail housing workspace navigation, theme switch, and account summary.
 */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-zinc-200 bg-zinc-50/90 lg:flex dark:border-zinc-800 dark:bg-[#111113]">
      <SidebarContent />
    </aside>
  );
}
