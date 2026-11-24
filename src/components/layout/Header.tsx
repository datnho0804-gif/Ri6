import {
  BookOpen,
  CloudOff,
  Download,
  LayoutDashboard,
  Scissors,
  Settings,
  Sprout,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { TabId, ViewId } from '../../types/models';

interface HeaderProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  isOnline: boolean;
  isStandalone: boolean;
  onInstallClick: () => void;
}

const DESKTOP_TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'trees', label: 'Cây', icon: Sprout },
  { id: 'pruning', label: 'Cắt tỉa', icon: Scissors },
  { id: 'reference', label: 'Tra cứu', icon: BookOpen },
];

const LOGO_URL = `${import.meta.env.BASE_URL}icons/logo.svg`;

export function Header({
  activeView,
  onSelectView,
  isOnline,
  isStandalone,
  onInstallClick,
}: HeaderProps) {
  return (
    <header className="app-header sticky top-0 z-30 bg-white border-b border-sand-200 safe-top shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
      {/* Row 1: Durian Logo + Orchard Name + Primary Actions */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-[64px] py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectView('overview')}
          className="min-h-[48px] flex items-center gap-2.5 text-left min-w-0 rounded-xl pr-1"
        >
          <img
            src={LOGO_URL}
            alt="Logo trái sầu riêng Ri6"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl border border-sand-200 bg-sand shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-ink truncate leading-tight">
              Sổ Tay Vườn Ri6
            </h1>
            <p className="text-sm text-ink-muted truncate leading-tight mt-0.5">
              Lộc Tấn, Đồng Nai
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop inline sync status slot + online status */}
          <div
            data-testid="sync-status-slot-desktop"
            aria-label="Trạng thái đồng bộ"
            className="hidden md:inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-sand-100 border border-sand-200 text-sm font-medium text-ink-muted"
          >
            <CloudOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Chưa bật đồng bộ</span>
          </div>

          <span
            className={`hidden md:inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border text-sm font-bold ${
              isOnline
                ? 'bg-status-ok-bg text-status-ok border-durian-200'
                : 'bg-status-warn-bg text-status-warn border-amber-300'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
          </span>

          {/* Install PWA Button (hidden in standalone mode) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={onInstallClick}
              className="min-h-[48px] min-w-[48px] px-3 sm:px-4 rounded-xl bg-durian-900 hover:bg-durian-950 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 transition"
              aria-label="Cài app lên điện thoại"
            >
              <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">Cài app lên điện thoại</span>
              <span className="lg:hidden">Cài</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => onSelectView('settings')}
            aria-label="Mở Cài đặt"
            aria-current={activeView === 'settings' ? 'page' : undefined}
            className={`min-w-[48px] min-h-[48px] px-3 rounded-xl border inline-flex items-center justify-center gap-2 text-sm font-bold transition ${
              activeView === 'settings'
                ? 'bg-basalt-700 text-white border-basalt-800'
                : 'bg-sand-100 hover:bg-sand-200 text-ink border-sand-300'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Cài đặt</span>
          </button>
        </div>
      </div>

      {/* Mobile Always-Visible Sync & Network Status Strip (SPEC §6) */}
      <div className="md:hidden border-t border-sand-200 bg-sand px-3 py-1.5 flex items-center justify-between gap-2 text-sm">
        <div
          data-testid="sync-status-slot-mobile"
          aria-label="Trạng thái đồng bộ"
          className="inline-flex items-center gap-1.5 font-medium text-ink-muted truncate"
        >
          <CloudOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Chưa bật đồng bộ</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold shrink-0 ${
            isOnline
              ? 'bg-status-ok-bg text-status-ok'
              : 'bg-status-warn-bg text-status-warn'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </span>
      </div>

      {/* Desktop Top Navigation Bar */}
      <nav
        className="hidden md:flex max-w-5xl mx-auto px-6 gap-1 border-t border-sand-200"
        aria-label="Điều hướng chính máy tính"
      >
        {DESKTOP_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[48px] px-5 text-base font-bold inline-flex items-center gap-2 border-b-[3px] transition ${
                active
                  ? 'border-durian-900 text-durian-900 bg-durian-50/50'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-sand'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
