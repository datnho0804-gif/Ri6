import { CheckCircle2, Cloud, CloudOff, Plus } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { PlaceholderTab } from './components/screens/PlaceholderTab';
import { SampleLogSheet } from './components/screens/SampleLogSheet';
import { SettingsScreen } from './components/screens/SettingsScreen';
import {
  Banner,
  Button,
  Card,
  Dialog,
  ExtendedFab,
  InstallGuideModal,
  ListItem,
  NavBar,
  NavRail,
  Skeleton,
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

const DesignShowcaseScreen = lazy(() =>
  import('./components/screens/DesignShowcaseScreen').then((m) => ({
    default: m.DesignShowcaseScreen,
  })),
);

function hasDesignFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const [, hashQuery = ''] = window.location.hash.split('?');
  return (
    new URLSearchParams(hashQuery).get('design') === '1' ||
    new URLSearchParams(window.location.search).get('design') === '1'
  );
}

function isDesignShowcaseUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const [hashPath] = window.location.hash.split('?');
  const normalizedPath = hashPath.replace(/^#/, '');
  return normalizedPath === '/design' && hasDesignFlag();
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

  const closeAllOverlays = useCallback(() => {
    setLogSheetOpen(false);
    setSyncDialogOpen(false);
    setDemoDialogOpen(false);
    setInstallGuideOpen(false);
  }, []);

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
        showSnackbar('Không thể khởi tạo dữ liệu ngoại tuyến trên thiết bị này.', {
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
      closeAllOverlays();
      setFabHidden(false);
      if (isDesignShowcaseUrl()) {
        setDesignShowcaseOpen(true);
        return;
      }
      setDesignShowcaseOpen(false);
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
  }, [closeAllOverlays]);

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
      closeAllOverlays();
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
    [closeAllOverlays, currentViewKey, designShowcaseOpen],
  );

  const openDesignShowcase = useCallback(() => {
    closeAllOverlays();
    scrollPositionsRef.current.set(currentViewKey, window.scrollY);
    window.location.hash = '#/design?design=1';
    setFabHidden(false);
    setDesignShowcaseOpen(true);
  }, [closeAllOverlays, currentViewKey]);

  const closeDesignShowcase = useCallback(() => {
    closeAllOverlays();
    scrollPositionsRef.current.set('design', window.scrollY);
    setDesignShowcaseOpen(false);
    setFabHidden(false);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setActiveView(lastTab);
  }, [closeAllOverlays, lastTab]);

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
      closeAllOverlays();
      setInstallGuideOpen(true);
    }
  }, [closeAllOverlays, hapticsEnabled, showSnackbar, triggerInstallPrompt]);

  const handleDemoUndoSnackbar = useCallback(
    (message = 'Đã xóa 1 mục xem trước') => {
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
  const showDesignEntry = import.meta.env.DEV || hasDesignFlag();

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
            ? 'Trạng thái đồng bộ sao lưu (chưa thiết lập)'
            : 'Đang ngoại tuyến — bấm để xem chi tiết lưu trữ'
        }
        onSyncClick={() => {
          closeAllOverlays();
          setSyncDialogOpen(true);
        }}
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
            <Suspense
              fallback={
                <Card padding="md" className="space-y-3" role="status" aria-label="Đang tải trang thiết kế">
                  <Skeleton variant="heading" />
                  <Skeleton variant="card" />
                  <Skeleton variant="card" />
                </Card>
              }
            >
              <DesignShowcaseScreen onShowUndoSnackbar={handleDemoUndoSnackbar} />
            </Suspense>
          ) : activeView === 'settings' ? (
            <SettingsScreen
              appVersion={APP_VERSION}
              dbState={dbState}
              isStandalone={isStandalone}
              hapticsEnabled={hapticsEnabled}
              showDesignEntry={showDesignEntry}
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
              onOpenSampleSheet={() => {
                closeAllOverlays();
                setLogSheetOpen(true);
              }}
              onOpenDemoDialog={() => {
                closeAllOverlays();
                setDemoDialogOpen(true);
              }}
              onDemoUndoSnackbar={() => handleDemoUndoSnackbar()}
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
            onClick={() => {
              closeAllOverlays();
              setLogSheetOpen(true);
            }}
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
        subtitle="Tính năng sao lưu trực tuyến đang được hoàn thiện"
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
              ? 'Thiết bị đang có mạng. Mọi ghi chép luôn lưu ngay trên máy trước để dùng không cần mạng.'
              : 'Thiết bị đang ngoại tuyến. Mọi ghi chép vẫn lưu bình thường trên máy.'}
          </Banner>
          <ListItem
            title="Dữ liệu vườn trên máy"
            subtitle={`Lô B: ${treeCount} cây · Lô A: ${lotACount} cây`}
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
        title="Xác nhận thao tác?"
        subtitle="Hộp thoại xác nhận dùng cho các thao tác quan trọng"
        onClose={() => setDemoDialogOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setDemoDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setDemoDialogOpen(false);
                triggerHaptic(hapticsEnabled);
                showSnackbar('Đã xác nhận thao tác.', { tone: 'info' });
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <p>
          Các thao tác quan trọng như xóa cây hoặc xóa cả đợt chăm sóc sẽ luôn hiện hộp xác nhận rõ
          ràng như thế này trước khi thực hiện.
        </p>
      </Dialog>

      <Snackbar items={snackbars} onDismiss={dismissSnackbar} />
    </div>
  );
}

export default App;
