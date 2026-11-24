import { Settings } from 'lucide-react';
import type { TabId, ViewId } from '../../types/models';
import { NAV_ITEMS } from './navItems';

export interface NavRailProps {
  activeView: ViewId;
  onSelectTab: (tab: TabId) => void;
  onSelectSettings: () => void;
  overviewBadgeCount?: number;
  preview?: boolean;
  className?: string;
}

/**
 * Material 3 Navigation Rail (80px fixed left bar for screens >= 840px per DESIGN §3).
 */
export function NavRail({
  activeView,
  onSelectTab,
  onSelectSettings,
  overviewBadgeCount = 0,
  preview = false,
  className = '',
}: NavRailProps) {
  const logoSrc = `${import.meta.env.BASE_URL}icons/logo.svg`;

  return (
    <nav
      aria-label="Thanh điều hướng dọc"
      className={[
        preview
          ? 'flex flex-col items-center w-20 py-3 bg-surface border border-outline rounded-lg shadow-e1 gap-2'
          : 'hidden rail:flex fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center py-3 bg-surface border-r border-outline gap-2 overflow-y-auto',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="w-11 h-11 rounded-sm bg-bg border border-outline flex items-center justify-center mb-2 shrink-0">
        <img
          src={logoSrc}
          alt=""
          width={30}
          height={30}
          decoding="async"
          className="w-7.5 h-7.5 object-contain"
        />
      </div>

      <div className="flex-1 flex flex-col items-center gap-2 w-full px-1">
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
                'pressable flex flex-col items-center justify-center gap-1 w-full min-h-14 py-1.5 rounded-sm',
                isActive ? 'text-text' : 'text-text-2',
              ].join(' ')}
            >
              <span
                className={[
                  'relative w-14 h-8 rounded-pill flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary-container text-on-primary-container' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon className="w-5.5 h-5.5" strokeWidth={2} aria-hidden="true" />
                {badge > 0 && (
                  <span
                    aria-label={`${badge} việc cần làm`}
                    className="absolute right-1 -top-0.5 min-w-5 h-5 px-1.5 rounded-pill bg-danger text-on-primary text-badge font-bold tabular-nums flex items-center justify-center"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="text-label font-semibold leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSelectSettings}
        aria-current={activeView === 'settings' ? 'page' : undefined}
        className={[
          'pressable flex flex-col items-center justify-center gap-1 w-full min-h-14 py-1.5 rounded-sm',
          activeView === 'settings' ? 'text-text' : 'text-text-2',
        ].join(' ')}
      >
        <span
          className={[
            'w-14 h-8 rounded-pill flex items-center justify-center transition-colors',
            activeView === 'settings'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-transparent',
          ].join(' ')}
        >
          <Settings className="w-5.5 h-5.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="text-label font-semibold leading-tight">Cài đặt</span>
      </button>
    </nav>
  );
}
