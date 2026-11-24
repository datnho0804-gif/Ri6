import { BookOpen, LayoutDashboard, Scissors, Sprout } from 'lucide-react';
import type { TabId, ViewId } from '../../types/models';

interface MobileBottomNavProps {
  activeView: ViewId;
  onSelectTab: (tab: TabId) => void;
}

const MOBILE_TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'trees', label: 'Cây', icon: Sprout },
  { id: 'pruning', label: 'Cắt tỉa', icon: Scissors },
  { id: 'reference', label: 'Tra cứu', icon: BookOpen },
];

export function MobileBottomNav({ activeView, onSelectTab }: MobileBottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-sand-200 shadow-[0_-4px_14px_rgba(28,25,23,0.08)] safe-bottom"
      aria-label="Thanh điều hướng điện thoại"
    >
      <div className="grid grid-cols-4 gap-1 px-2 pt-1.5">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                active
                  ? 'bg-durian-900 text-white'
                  : 'text-ink-muted hover:text-ink active:bg-sand-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
