import { CheckCircle2, Cloud, CloudOff, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DesignShowcaseScreen } from './components/screens/DesignShowcaseScreen';
import { PlaceholderTab } from './components/screens/PlaceholderTab';
import { SampleLogSheet } from './components/screens/SampleLogSheet';
import { SettingsScreen } from './components/screens/SettingsScreen';
import {
  Banner,
  Button,
  Dialog,
  ExtendedFab,
  InstallGuideModal,
  ListItem,
  NavBar,
  NavRail,
  Snackbar,
  StatusPill,
  TopAppBar,
} from './components/ui';
import { type DatabaseInitResult, db, initDatabase } from './db/database';
import { usePwa } from './hooks/usePwa';
import { useSnackbar } from './hooks/useSnackbar';
import { useThemeColor } from './hooks/useThemeColor';
import { todayVN } from './lib/date';
import { formatHeaderDateVN } from './lib/format';
import { triggerHaptic } from './lib/haptics';
import type { TabId, ViewId } from './types/models';

const APP_VERSION = __APP_VERSION__;

function isDesignShowcaseUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  const [hashPath, hashQuery = ''] = hash.split('?');
  const normalizedPath = hashPath.replace(/^#/, '');
  if (normalizedPath !== '/design') return false;
  const hashParams = new URLSearchParams(hashQuery);
  const searchParams = new URLSearchParams(search);
  return hashParams.get('design') === '1' || searchParams.get('design') === '1';
}

function getShortcutAction(): 'log' | 'photo' | 'agenda' | null {
  if (typeof window === 'undefined') return null;
  const hashPath = window.location.hash.split('?')[0].replace(/^#/, '');
  if (hashPath === '/log') return 'log';
  if (hashPath === '/photo') return 'photo';
  if (hashPath === '/agenda') return 'agenda';
  return null;
}

export function App() {
  const [activeView, setActiveView] = useState<ViewId>(() =>
    getShortcutAction() === 'photo' ? 'trees' : 'overview',
  );
  const [lastTab, setLastTab] = useState<TabId>(() =>
    getShortcutAction() === 'photo' ? 'trees' : 'overview',
  );
  const [designShowcaseOpen, setDesignShowcaseOpen] = useState<boolean>(() =>
    isDesignShowcaseUrl(),
  );
  const [dbState, setDbState] = useState<DatabaseInitResult | null>(null);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [logSheetOpen, setLogSheetOpen] = useState<boolean>(
    () => !isDesignShowcaseUrl() && getShortcutAction() === 'log',
  );
  const [fabHidden, setFabHidden] = useState(false);

  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const lastScrollYRef = useRef(0);

  const { items: snackbars, showSnackbar, dismissSnackbar } = useSnackbar();
  const { isOnline, isStandalone, triggerInstallPrompt } = usePwa();

  useThemeColor('#faf8f5');

  // Initialize Dexie database and detect version upgrades
  useEffect(() => {
    let mounted = true;
    initDatabase(APP_VERSION)
      .then((result) => {
        if (!mounted) return;
        setDbState(result);
        setHapticsEnabled(result.settings.hapticsEnabled ?? true);
        if (result.versionError) {
          showSnackbar('Cần cập nhật ứng dụng để đọc dữ liệu mới hơn.', {
            tone: 'danger',
            durationMs: 6000,
          });
        } else if (result.wasUpgradedFromVersion) {
          showSnackbar(`Đã cập nhật lên v${APP_VERSION}`, { tone: 'ok', durationMs: 5000 });
        }
      })
      .catch(() => {
        if (!mounted) return;
        showSnackbar('Không thể khởi tạo cơ sở dữ liệu offline trên thiết bị này.', {
          tone: 'danger',
          durationMs: 6000,
        });
      });
    return () => {
      mounted = false;
    };
  }, [showSnackbar]);

  // Listen to hash changes for #/design?design=1 and PWA manifest shortcuts (#/log, #/photo, #/agenda)
  useEffect(() => {
    const applyRoute = () => {
      if (isDesignShowcaseUrl()) {
        setDesignShowcaseOpen(true);
        setFabHidden(false);
        return;
      }
      setDesignShowcaseOpen(false);
      setFabHidden(false);
      const shortcut = getShortcutAction();
      if (shortcut === 'log') {
        setActiveView('overview');
        setLastTab('overview');
        setLogSheetOpen(true);
      } else if (shortcut === 'photo') {
        setActiveView('trees');
        setLastTab('trees');
      } else if (shortcut === 'agenda') {
        setActiveView('overview');
        setLastTab('overview');
      }
    };

    window.addEventListener('hashchange', applyRoute);
    return () => window.removeEventListener('hashchange', applyRoute);
  }, []);

  // Auto-hide ExtendedFAB on downward scroll, reveal on upward scroll (DESIGN §3)
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      if (y <= 40) {
        setFabHidden(false);
      } else if (delta > 16) {
        setFabHidden(true);
      } else if (delta < -10) {
        setFabHidden(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position when returning to a previously visited view (DESIGN §6)
  const currentViewKey = designShowcaseOpen ? 'design' : activeView;
  useEffect(() => {
    const saved = scrollPositionsRef.current.get(currentViewKey) ?? 0;
    window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
    lastScrollYRef.current = saved;
  }, [currentViewKey]);

  const navigateToView = useCallback(
    (next: ViewId) => {
      scrollPositionsRef.current.set(currentViewKey, window.scrollY);
      if (designShowcaseOpen) {
        setDesignShowcaseOpen(false);
        if (window.location.hash.startsWith('#/design')) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
      }
      if (next !== 'settings') {
        setLastTab(next);
      }
      setFabHidden(false);
      setActiveView(next);
    },
    [currentViewKey, designShowcaseOpen],
  );

  const openDesignShowcase = useCallback(() => {
    scrollPositionsRef.current.set(currentViewKey, window.scrollY);
    window.location.hash = '#/design?design=1';
    setFabHidden(false);
    setDesignShowcaseOpen(true);
  }, [currentViewKey]);

  const closeDesignShowcase = useCallback(() => {
    scrollPositionsRef.current.set('design', window.scrollY);
    setDesignShowcaseOpen(false);
    setFabHidden(false);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setActiveView(lastTab);
  }, [lastTab]);

  const handleToggleHaptics = useCallback(
    async (next: boolean) => {
      setHapticsEnabled(next);
      if (next) {
        triggerHaptic(true);
      }
      try {
        await db.settings.update('app', { hapticsEnabled: next });
        showSnackbar(next ? 'Đã bật rung nhẹ khi thao tác.' : 'Đã tắt rung nhẹ.', {
          tone: 'info',
          durationMs: 2500,
        });
      } catch {
        showSnackbar('Không thể lưu tùy chọn rung nhẹ.', { tone: 'danger' });
      }
    },
    [showSnackbar],
  );

  const handleInstallClick = useCallback(async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome === 'accepted') {
      triggerHaptic(hapticsEnabled);
      showSnackbar('Đã cài Sổ Tay Vườn Ri6 ra màn hình chính!', { tone: 'ok' });
    } else if (outcome === 'fallback') {
      setInstallGuideOpen(true);
    }
  }, [hapticsEnabled, showSnackbar, triggerInstallPrompt]);

  const handleDemoUndoSnackbar = useCallback(
    (message = 'Đã xóa 1 mục nhật ký mẫu') => {
      showSnackbar(message, {
        tone: 'ok',
        actionLabel: 'Hoàn tác',
        durationMs: 5000,
        onAction: () => {
          triggerHaptic(hapticsEnabled);
          showSnackbar('Đã khôi phục lại mục vừa xóa.', { tone: 'info', durationMs: 3000 });
        },
      });
    },
    [hapticsEnabled, showSnackbar],
  );

  const today = todayVN();
  const treeCount = dbState?.treeCount ?? 0;
  const lotACount = dbState?.lotACount ?? 0;

  let barTitle = 'Vườn Ri6';
  let barSubtitle = `${formatHeaderDateVN(today)} · Lộc Tấn`;
  let barOnBack: (() => void) | undefined;

  if (designShowcaseOpen) {
    barTitle = 'Hệ thống thiết kế';
    barSubtitle = `#/design?design=1 · v${APP_VERSION}`;
    barOnBack = closeDesignShowcase;
  } else if (activeView === 'settings') {
    barTitle = 'Cài đặt';
    barSubtitle = `Sổ Tay Vườn Ri6 · v${APP_VERSION}`;
    barOnBack = () => navigateToView(lastTab);
  } else if (activeView === 'trees') {
    barTitle = 'Cây';
    barSubtitle = `${treeCount} cây cá thể · Lô A ${lotACount} cây`;
  } else if (activeView === 'pruning') {
    barTitle = 'Cắt tỉa';
    barSubtitle = '3 góc chụp & chấm mức độ';
  } else if (activeView === 'reference') {
    barTitle = 'Tra cứu';
    barSubtitle = 'Phác đồ 5 bước & máy tính Ri6';
  }

  const showFab = !designShowcaseOpen && (activeView === 'overview' || activeView === 'trees');

  return (
    <div
      className={[
        'min-h-dvh flex flex-col bg-bg text-text',
        designShowcaseOpen ? '' : 'rail:pl-20',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!designShowcaseOpen && (
        <NavRail
          activeView={activeView}
          onSelectTab={navigateToView}
          onSelectSettings={() => navigateToView('settings')}
        />
      )}

      <TopAppBar
        title={barTitle}
        subtitle={barSubtitle}
        onBack={barOnBack}
        isOffline={!isOnline}
        syncStatusDot={!isOnline ? 'warn' : 'neutral'}
        syncLabel={
          isOnline
            ? 'Trạng thái đồng bộ GitHub (chưa thiết lập)'
            : 'Đang ngoại tuyến — bấm để xem chi tiết lưu trữ'
        }
        onSyncClick={() => setSyncDialogOpen(true)}
        onSettingsClick={
          designShowcaseOpen || activeView === 'settings'
            ? undefined
            : () => navigateToView('settings')
        }
        settingsActive={activeView === 'settings' && !designShowcaseOpen}
      />

      <main
        className={[
          'flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4',
          designShowcaseOpen ? 'pb-10' : 'main-safe-bottom',
        ].join(' ')}
      >
        <div key={currentViewKey} className="animate-screen-enter">
          {designShowcaseOpen ? (
            <DesignShowcaseScreen onShowUndoSnackbar={handleDemoUndoSnackbar} />
          ) : activeView === 'settings' ? (
            <SettingsScreen
              appVersion={APP_VERSION}
              dbState={dbState}
              isStandalone={isStandalone}
              hapticsEnabled={hapticsEnabled}
              onToggleHaptics={(next) => {
                void handleToggleHaptics(next);
              }}
              onInstallClick={() => {
                void handleInstallClick();
              }}
              onOpenDesignShowcase={openDesignShowcase}
            />
          ) : (
            <PlaceholderTab
              tab={activeView}
              dbState={dbState}
              onOpenSampleSheet={() => setLogSheetOpen(true)}
              onOpenDemoDialog={() => setDemoDialogOpen(true)}
              onDemoUndoSnackbar={() => handleDemoUndoSnackbar()}
              onOpenDesignShowcase={openDesignShowcase}
              onNavigateTab={navigateToView}
            />
          )}
        </div>
      </main>

      {showFab && (
        <div className="fixed right-4 bottom-24 rail:bottom-6 rail:right-6 z-30">
          <ExtendedFab
            icon={<Plus className="w-6 h-6" />}
            label="Ghi nhật ký"
            hidden={fabHidden}
            onClick={() => setLogSheetOpen(true)}
          />
        </div>
      )}

      {!designShowcaseOpen && <NavBar activeView={activeView} onSelectTab={navigateToView} />}

      <SampleLogSheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        hapticsEnabled={hapticsEnabled}
        treeCount={treeCount}
        lotACount={lotACount}
        onSaved={(summary) => handleDemoUndoSnackbar(summary)}
      />

      <InstallGuideModal open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />

      <Dialog
        open={syncDialogOpen}
        title="Trạng thái đồng bộ"
        subtitle="Đồng bộ hai chiều qua GitHub repo Ri6-data sẽ kích hoạt ở bước T04"
        onClose={() => setSyncDialogOpen(false)}
        footer={
          <>
            <Button
              variant="tonal"
              onClick={() => {
                setSyncDialogOpen(false);
                navigateToView('settings');
              }}
            >
              Mở Cài đặt
            </Button>
            <Button variant="filled" onClick={() => setSyncDialogOpen(false)}>
              Đóng
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Banner
            tone={isOnline ? 'ok' : 'warn'}
            icon={isOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          >
            {isOnline
              ? 'Thiết bị đang có mạng. Dữ liệu vẫn lưu cục bộ trên máy trước (offline-first).'
              : 'Thiết bị đang ngoại tuyến. Mọi thao tác vẫn hoạt động bình thường trên IndexedDB.'}
          </Banner>
          <ListItem
            title="Cơ sở dữ liệu trên máy"
            subtitle={`Dexie v1 · ${dbState?.tableCount ?? 8} bảng · ${treeCount} cây Lô B · ${lotACount} cây Lô A`}
            trailing={
              <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                Sẵn sàng
              </StatusPill>
            }
          />
        </div>
      </Dialog>

      <Dialog
        open={demoDialogOpen}
        title="Kiểm tra hộp thoại Dialog"
        subtitle="Hỗ trợ focus trap (Tab), đóng bằng Esc và nút Back Android"
        onClose={() => setDemoDialogOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setDemoDialogOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setDemoDialogOpen(false);
                triggerHaptic(hapticsEnabled);
                showSnackbar('Đã xác nhận từ Dialog (không dùng alert/confirm).', { tone: 'info' });
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <p>
          Hộp thoại này thay thế hoàn toàn <code>alert()</code> và <code>confirm()</code> mặc định
          của trình duyệt. Nhấn phím <strong>Tab</strong> để di chuyển vòng lặp bên trong hộp thoại
          hoặc nhấn <strong>Esc</strong> để đóng.
        </p>
      </Dialog>

      <Snackbar items={snackbars} onDismiss={dismissSnackbar} />
    </div>
  );
}

export default App;
