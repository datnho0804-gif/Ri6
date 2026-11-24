import type { TabId, ViewId } from '../../types/models';
import { NAV_ITEMS } from './navItems';

export interface NavBarProps {
  activeView: ViewId;
  onSelectTab: (tab: TabId) => void;
  overviewBadgeCount?: number;
  className?: string;
  /** Render inline inside documentation/showcase instead of fixed to viewport bottom. */
  preview?: boolean;
}

/**
 * Material 3 Bottom Navigation Bar (< 840px, 80px + safe-bottom, 64x32 active pill, 14px labels) (DESIGN §3).
 */
export function NavBar({
  activeView,
  onSelectTab,
  overviewBadgeCount = 0,
  className = '',
  preview = false,
}: NavBarProps) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className={[
        preview
          ? 'bg-surface border border-outline rounded-lg shadow-e1 w-full'
          : 'rail:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-outline safe-bottom',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="grid grid-cols-4 px-1 pt-2 pb-1.5 min-h-20">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          const badge = id === 'overview' && overviewBadgeCount > 0 ? overviewBadgeCount : 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'pressable flex flex-col items-center justify-center gap-1 min-h-14 rounded-sm px-1',
                isActive ? 'text-text' : 'text-text-2',
              ].join(' ')}
            >
              <span
                className={[
                  'relative w-16 h-8 rounded-pill flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary-container text-on-primary-container' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon className="w-5.5 h-5.5" strokeWidth={2} aria-hidden="true" />
                {badge > 0 && (
                  <span
                    aria-label={`${badge} việc cần làm`}
                    className="absolute right-2 -top-0.5 min-w-5 h-5 px-1.5 rounded-pill bg-danger text-on-primary text-badge font-bold tabular-nums flex items-center justify-center"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="text-label font-semibold leading-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
