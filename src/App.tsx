import { CheckCircle2, Cloud, CloudOff, Plus } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OverviewScreen } from './components/screens/OverviewScreen';
import { Banner } from './components/ui/Banner';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Dialog } from './components/ui/Dialog';
import { ExtendedFab } from './components/ui/Fab';
import { ListItem } from './components/ui/ListItem';
import { NavBar } from './components/ui/NavBar';
import { NavRail } from './components/ui/NavRail';
import { Skeleton } from './components/ui/Skeleton';
import { Snackbar } from './components/ui/Snackbar';
import { StatusPill } from './components/ui/StatusPill';
import { TopAppBar } from './components/ui/TopAppBar';
import { generateDeviceId, LOT_A_ID } from './db/seed';
import { useOrchardData } from './hooks/useOrchardData';
import { usePwa } from './hooks/usePwa';
import { useSnackbar } from './hooks/useSnackbar';
import { useThemeColor } from './hooks/useThemeColor';
import { nowUTC, todayVN } from './lib/date';
import { formatHeaderDateVN } from './lib/format';
import { triggerHaptic } from './lib/haptics';
import { effectiveSeason as resolveSeason } from './lib/season';
import { duplicateCodes } from './lib/treeCodes';
import type { TreeFilter } from './lib/treeFilters';
import type { Log, PhotoKind, Season, TabId, Tree, ViewId } from './types/models';

const APP_VERSION = __APP_VERSION__;

const InstallGuideModal = lazy(() =>
  import('./components/ui/InstallGuideModal').then((m) => ({
    default: m.InstallGuideModal,
  })),
);
const DesignShowcaseScreen = lazy(() =>
  import('./components/screens/DesignShowcaseScreen').then((m) => ({
    default: m.DesignShowcaseScreen,
  })),
);
const TreesScreen = lazy(() =>
  import('./components/screens/TreesScreen').then((m) => ({ default: m.TreesScreen })),
);
const TreeProfileScreen = lazy(() =>
  import('./components/screens/TreeProfileScreen').then((m) => ({
    default: m.TreeProfileScreen,
  })),
);
const LotADetailScreen = lazy(() =>
  import('./components/screens/LotADetailScreen').then((m) => ({
    default: m.LotADetailScreen,
  })),
);
const PruningScreen = lazy(() =>
  import('./components/screens/PruningScreen').then((m) => ({
    default: m.PruningScreen,
  })),
);
const ReferenceScreen = lazy(() =>
  import('./components/screens/ReferenceScreen').then((m) => ({
    default: m.ReferenceScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import('./components/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const LogFormSheet = lazy(() =>
  import('./components/screens/LogFormSheet').then((m) => ({ default: m.LogFormSheet })),
);
const QuickPhotoSheet = lazy(() =>
  import('./components/screens/QuickPhotoSheet').then((m) => ({ default: m.QuickPhotoSheet })),
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

function useIsWideRail(): boolean {
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 840 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 840px)');
    const handle = () => setIsWide(mq.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  return isWide;
}

export function App() {
  const isWideRail = useIsWideRail();

  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [lastTab, setLastTab] = useState<TabId>('overview');
  const [treesInitialFilter, setTreesInitialFilter] = useState<TreeFilter>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [mobileDetailTargetId, setMobileDetailTargetId] = useState<string | null>(null);

  const [designShowcaseOpen, setDesignShowcaseOpen] = useState<boolean>(() =>
    isDesignShowcaseUrl(),
  );

  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState<boolean>(
    () => !isDesignShowcaseUrl() && getShortcutAction() === 'photo',
  );
  const [logSheetTarget, setLogSheetTarget] = useState<{
    open: boolean;
    fixedTargetId?: string;
    fixedTargetLabel?: string;
  }>(() => ({
    open: !isDesignShowcaseUrl() && getShortcutAction() === 'log',
  }));
  const [fabHidden, setFabHidden] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const lastScrollYRef = useRef(0);

  const { items: snackbars, showSnackbar, dismissSnackbar } = useSnackbar();
  const { isOnline, isStandalone, triggerInstallPrompt } = usePwa();

  const handleStartupNotice = useCallback(
    (notice: { message: string; tone: 'ok' | 'danger' }) => {
      showSnackbar(notice.message, {
        tone: notice.tone,
        durationMs: notice.tone === 'danger' ? 6000 : 5000,
      });
    },
    [showSnackbar],
  );

  const orchard = useOrchardData(APP_VERSION, handleStartupNotice);

  const hapticsEnabled = orchard.settings?.hapticsEnabled ?? true;
  const today = todayVN();
  const effectiveSeason: Season = resolveSeason(today, orchard.settings?.seasonOverride);
  const deviceId = orchard.settings?.deviceId ?? orchard.dbState?.settings.deviceId ?? 'local-device';

  const dupes = useMemo(() => duplicateCodes(orchard.allTrees), [orchard.allTrees]);

  // Default light theme-color (TreeProfileScreen overrides to dark when full-bleed hero is open on mobile)
  useThemeColor('bg');

  const closeAllOverlays = useCallback(() => {
    setLogSheetTarget({ open: false });
    setQuickPhotoOpen(false);
    setSyncDialogOpen(false);
    setInstallGuideOpen(false);
  }, []);

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
        setMobileDetailTargetId(null);
        setActiveView('overview');
        setLastTab('overview');
        setLogSheetTarget({ open: true });
      } else if (shortcut === 'photo') {
        setMobileDetailTargetId(null);
        setQuickPhotoOpen(true);
      } else if (shortcut === 'agenda') {
        setMobileDetailTargetId(null);
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
  const currentViewKey = designShowcaseOpen
    ? 'design'
    : mobileDetailTargetId && !isWideRail
      ? `detail:${mobileDetailTargetId}`
      : activeView;

  useEffect(() => {
    const saved = scrollPositionsRef.current.get(currentViewKey) ?? 0;
    window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
    lastScrollYRef.current = saved;
  }, [currentViewKey]);

  const navigateToView = useCallback(
    (next: ViewId) => {
      setHasNavigated(true);
      closeAllOverlays();
      scrollPositionsRef.current.set(currentViewKey, window.scrollY);
      setMobileDetailTargetId(null);
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

  const openTargetDetail = useCallback(
    (targetId: string) => {
      setHasNavigated(true);
      scrollPositionsRef.current.set(currentViewKey, window.scrollY);
      setSelectedTargetId(targetId);
      if (isWideRail) {
        setActiveView('trees');
        setLastTab('trees');
        setMobileDetailTargetId(null);
      } else {
        setMobileDetailTargetId(targetId);
      }
    },
    [currentViewKey, isWideRail],
  );

  const openDesignShowcase = useCallback(() => {
    setHasNavigated(true);
    closeAllOverlays();
    scrollPositionsRef.current.set(currentViewKey, window.scrollY);
    setMobileDetailTargetId(null);
    window.location.hash = '#/design?design=1';
    setFabHidden(false);
    setDesignShowcaseOpen(true);
  }, [closeAllOverlays, currentViewKey]);

  const closeDesignShowcase = useCallback(() => {
    setHasNavigated(true);
    closeAllOverlays();
    scrollPositionsRef.current.set('design', window.scrollY);
    setDesignShowcaseOpen(false);
    setFabHidden(false);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setActiveView(lastTab);
  }, [closeAllOverlays, lastTab]);

  const notify = useCallback(
    (message: string, tone: 'ok' | 'info' | 'warn' | 'danger' = 'ok') => {
      showSnackbar(message, { tone });
    },
    [showSnackbar],
  );

  const handleToggleHaptics = useCallback(
    async (next: boolean) => {
      if (next) triggerHaptic(true);
      try {
        await orchard.updateSettings({ hapticsEnabled: next });
        showSnackbar(next ? 'Đã bật rung nhẹ khi thao tác.' : 'Đã tắt rung nhẹ.', {
          tone: 'info',
          durationMs: 2500,
        });
      } catch {
        showSnackbar('Không thể lưu tùy chọn rung nhẹ.', { tone: 'danger' });
      }
    },
    [orchard, showSnackbar],
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

  const handleDeleteSingleLog = useCallback(
    async (log: Log) => {
      const tombstone = await orchard.deleteSingleLog(log);
      showSnackbar('Đã xóa 1 mục nhật ký', {
        tone: 'info',
        actionLabel: 'Hoàn tác',
        durationMs: 5000,
        onAction: () => {
          void orchard.undoDeleteLog(tombstone).then(() => {
            triggerHaptic(hapticsEnabled);
            showSnackbar('Đã khôi phục mục nhật ký.', { tone: 'ok', durationMs: 3000 });
          });
        },
      });
    },
    [hapticsEnabled, orchard, showSnackbar],
  );

  const handleDeleteBatch = useCallback(
    async (batchId: string) => {
      const count = await orchard.deleteBatchById(batchId);
      triggerHaptic(hapticsEnabled);
      showSnackbar(`Đã xóa cả đợt (${count} mục nhật ký).`, { tone: 'info', durationMs: 4000 });
    },
    [hapticsEnabled, orchard, showSnackbar],
  );

  const handleCaptureWeeklyPhoto = useCallback(
    async (tree: Tree, file: File) => {
      await orchard.saveCapturedPhoto(tree.id, file, 'weekly');
      triggerHaptic(hapticsEnabled);
      showSnackbar(`Đã lưu ảnh tuần cho ${tree.code} — chuyển sang Đã chụp.`, { tone: 'ok' });
    },
    [hapticsEnabled, orchard, showSnackbar],
  );

  const handleCaptureLotAPhoto = useCallback(
    async (file: File) => {
      await orchard.saveCapturedPhoto(LOT_A_ID, file, 'weekly');
      triggerHaptic(hapticsEnabled);
      showSnackbar('Đã lưu ảnh cho Lô A.', { tone: 'ok' });
    },
    [hapticsEnabled, orchard, showSnackbar],
  );

  const handleSavePruningAssessment = useCallback(
    async (tree: Tree, note: string) => {
      await orchard.updateTree(tree, { needsPruning: true });
      const now = nowUTC();
      const log: Log = {
        id: generateDeviceId(),
        targetId: tree.id,
        date: todayVN(),
        type: 'cat-tia',
        note,
        updatedAt: now,
        updatedBy: deviceId,
      };
      await orchard.saveLogs([log]);
    },
    [deviceId, orchard],
  );

  const handleCapturePrunePhoto = useCallback(
    async (tree: Tree, file: File, kind: PhotoKind) => {
      await orchard.saveCapturedPhoto(tree.id, file, kind);
    },
    [orchard],
  );

  const handleDemoUndoSnackbar = useCallback(
    (message = 'Đã xóa 1 mục mẫu') => {
      showSnackbar(message, {
        tone: 'ok',
        actionLabel: 'Hoàn tác',
        durationMs: 5000,
        onAction: () => {
          triggerHaptic(hapticsEnabled);
          showSnackbar('Đã khôi phục mục mẫu.', { tone: 'info', durationMs: 3000 });
        },
      });
    },
    [hapticsEnabled, showSnackbar],
  );

  const treeCount = orchard.trees.length;
  const lotACount = orchard.lotA?.treeCount ?? 0;
  const showDesignEntry = import.meta.env.DEV || hasDesignFlag();

  // Mobile full-screen detail view (<840px)
  const activeMobileTree =
    !isWideRail && mobileDetailTargetId && mobileDetailTargetId !== LOT_A_ID
      ? (orchard.trees.find((t) => t.id === mobileDetailTargetId) ?? null)
      : null;
  const isMobileLotADetail = !isWideRail && mobileDetailTargetId === LOT_A_ID && Boolean(orchard.lotA);
  const isMobileFullDetail = Boolean(activeMobileTree || isMobileLotADetail);

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

  const showFab =
    !designShowcaseOpen &&
    !isMobileFullDetail &&
    (activeView === 'overview' || activeView === 'trees');

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

      {/* Mobile full-screen Tree Profile or Lot A Detail */}
      {activeMobileTree ? (
        <Suspense
          fallback={
            <div className="p-4 space-y-4">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          }
        >
          <TreeProfileScreen
            tree={activeMobileTree}
            duplicateCodeSet={dupes}
            logs={orchard.logs}
            photos={orchard.photos}
            thumbUrls={orchard.thumbUrls}
            season={effectiveSeason}
            hapticsEnabled={hapticsEnabled}
            onBack={() => setMobileDetailTargetId(null)}
            onUpdateTree={orchard.updateTree}
            onDeleteTree={async (t) => {
              await orchard.softDeleteTree(t);
              setMobileDetailTargetId(null);
              setSelectedTargetId(null);
              notify(`Đã xóa cây ${t.code}.`, 'info');
            }}
            onOpenAddLog={() =>
              setLogSheetTarget({
                open: true,
                fixedTargetId: activeMobileTree.id,
                fixedTargetLabel: activeMobileTree.code,
              })
            }
            onDeleteLog={(log) => {
              void handleDeleteSingleLog(log);
            }}
            onDeleteBatch={(batchId) => {
              void handleDeleteBatch(batchId);
            }}
            onCaptureWeeklyPhoto={handleCaptureWeeklyPhoto}
            getPhotoFullUrl={orchard.getPhotoFullUrl}
            onNotify={notify}
          />
        </Suspense>
      ) : isMobileLotADetail && orchard.lotA ? (
        <Suspense
          fallback={
            <div className="p-4 space-y-4">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          }
        >
          <LotADetailScreen
            lotA={orchard.lotA}
            logs={orchard.logs}
            photos={orchard.photos}
            thumbUrls={orchard.thumbUrls}
            hapticsEnabled={hapticsEnabled}
            onBack={() => setMobileDetailTargetId(null)}
            onUpdateLotA={orchard.updateLotA}
            onSplitTrees={orchard.splitFromLotA}
            onOpenAddLog={() =>
              setLogSheetTarget({
                open: true,
                fixedTargetId: LOT_A_ID,
                fixedTargetLabel: 'Lô A',
              })
            }
            onDeleteLog={(log) => {
              void handleDeleteSingleLog(log);
            }}
            onDeleteBatch={(batchId) => {
              void handleDeleteBatch(batchId);
            }}
            onCaptureLotPhoto={handleCaptureLotAPhoto}
            getPhotoFullUrl={orchard.getPhotoFullUrl}
            onNotify={notify}
          />
        </Suspense>
      ) : (
        <>
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
              'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4',
              designShowcaseOpen ? 'pb-10' : 'main-safe-bottom',
            ].join(' ')}
          >
            <div key={currentViewKey} className={hasNavigated ? 'animate-screen-enter' : undefined}>
              {designShowcaseOpen ? (
                <Suspense
                  fallback={
                    <Card
                      padding="md"
                      className="space-y-3"
                      role="status"
                      aria-label="Đang tải trang thiết kế"
                    >
                      <Skeleton variant="heading" />
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </Card>
                  }
                >
                  <DesignShowcaseScreen onShowUndoSnackbar={handleDemoUndoSnackbar} />
                </Suspense>
              ) : activeView === 'settings' ? (
                <Suspense
                  fallback={
                    <div className="space-y-3">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  }
                >
                  <SettingsScreen
                    appVersion={APP_VERSION}
                    dbState={orchard.dbState}
                    deviceId={deviceId}
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
                    onExportJson={orchard.exportBackupJson}
                    onGetLocalSnapshot={orchard.getOrchardStateSnapshot}
                    onApplyImport={orchard.applyImportedBackup}
                    onNotify={notify}
                  />
                </Suspense>
              ) : activeView === 'overview' ? (
                <OverviewScreen
                  loading={orchard.loading}
                  season={effectiveSeason}
                  trees={orchard.trees}
                  lotA={orchard.lotA}
                  logs={orchard.logs}
                  photos={orchard.photos}
                  thumbUrls={orchard.thumbUrls}
                  onToggleSeason={(next) => {
                    void orchard.setSeasonOverride(next).then(() => {
                      triggerHaptic(hapticsEnabled);
                      notify(
                        next === 'kho'
                          ? 'Đã chuyển sang chế độ Mùa khô.'
                          : 'Đã chuyển sang chế độ Mùa mưa.',
                        'info',
                      );
                    });
                  }}
                  onSelectTree={openTargetDetail}
                  onOpenQuickPhoto={() => {
                    closeAllOverlays();
                    setQuickPhotoOpen(true);
                  }}
                  onOpenTreesFiltered={(filter) => {
                    setTreesInitialFilter(filter);
                    navigateToView('trees');
                  }}
                />
              ) : activeView === 'trees' ? (
                <Suspense
                  fallback={
                    <div className="space-y-3">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  }
                >
                  <TreesScreen
                    key={treesInitialFilter}
                    trees={orchard.trees}
                    allTrees={orchard.allTrees}
                    lotA={orchard.lotA}
                    logs={orchard.logs}
                    photos={orchard.photos}
                    thumbUrls={orchard.thumbUrls}
                    season={effectiveSeason}
                    hapticsEnabled={hapticsEnabled}
                    initialFilter={treesInitialFilter}
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={(id) => {
                      if (id === null) {
                        setSelectedTargetId(null);
                        setMobileDetailTargetId(null);
                      } else {
                        openTargetDetail(id);
                      }
                    }}
                    onAddTree={orchard.addTree}
                    onUpdateTree={orchard.updateTree}
                    onDeleteTree={async (t) => {
                      await orchard.softDeleteTree(t);
                      notify(`Đã xóa cây ${t.code}.`, 'info');
                    }}
                    onUpdateLotA={orchard.updateLotA}
                    onSplitFromLotA={orchard.splitFromLotA}
                    onOpenBatchLog={() => {
                      closeAllOverlays();
                      setLogSheetTarget({ open: true });
                    }}
                    onOpenSingleLog={(targetId, targetLabel) => {
                      closeAllOverlays();
                      setLogSheetTarget({
                        open: true,
                        fixedTargetId: targetId,
                        fixedTargetLabel: targetLabel,
                      });
                    }}
                    onDeleteLog={(log) => {
                      void handleDeleteSingleLog(log);
                    }}
                    onDeleteBatch={(batchId) => {
                      void handleDeleteBatch(batchId);
                    }}
                    onCaptureWeeklyPhoto={handleCaptureWeeklyPhoto}
                    onCaptureLotAPhoto={handleCaptureLotAPhoto}
                    getPhotoFullUrl={orchard.getPhotoFullUrl}
                    onNotify={notify}
                  />
                </Suspense>
              ) : activeView === 'pruning' ? (
                <Suspense
                  fallback={
                    <div className="space-y-3">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  }
                >
                  <PruningScreen
                    trees={orchard.trees}
                    photos={orchard.photos}
                    thumbUrls={orchard.thumbUrls}
                    season={effectiveSeason}
                    hapticsEnabled={hapticsEnabled}
                    onSavePruningAssessment={handleSavePruningAssessment}
                    onCapturePrunePhoto={handleCapturePrunePhoto}
                    getPhotoFullUrl={orchard.getPhotoFullUrl}
                    onNotify={notify}
                  />
                </Suspense>
              ) : (
                <Suspense
                  fallback={
                    <div className="space-y-3">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  }
                >
                  <ReferenceScreen trees={orchard.trees} lotA={orchard.lotA} />
                </Suspense>
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
                  setLogSheetTarget({ open: true });
                }}
              />
            </div>
          )}

          {!designShowcaseOpen && <NavBar activeView={activeView} onSelectTab={navigateToView} />}
        </>
      )}

      {/* Persistent Single & Batch Log Form BottomSheet (T02 AC5) */}
      {logSheetTarget.open && (
        <Suspense fallback={null}>
          <LogFormSheet
            open={logSheetTarget.open}
            fixedTargetId={logSheetTarget.fixedTargetId}
            fixedTargetLabel={logSheetTarget.fixedTargetLabel}
            trees={orchard.trees}
            lotACount={lotACount}
            existingLogs={orchard.logs}
            deviceId={deviceId}
            hapticsEnabled={hapticsEnabled}
            onClose={() => setLogSheetTarget({ open: false })}
            onLogsCreated={async (newLogs, summary) => {
              await orchard.saveLogs(newLogs);
              notify(summary, 'ok');
            }}
          />
        </Suspense>
      )}

      {/* Quick Weekly Photo Capture Sheet triggered by #/photo shortcut (T02 AC0) */}
      {quickPhotoOpen && (
        <Suspense fallback={null}>
          <QuickPhotoSheet
            open={quickPhotoOpen}
            onClose={() => setQuickPhotoOpen(false)}
            trees={orchard.trees}
            photos={orchard.photos}
            onCapturePhoto={async (tree, file) => {
              await handleCaptureWeeklyPhoto(tree, file);
              openTargetDetail(tree.id);
            }}
          />
        </Suspense>
      )}

      {installGuideOpen && (
        <Suspense fallback={null}>
          <InstallGuideModal open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
        </Suspense>
      )}

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
            subtitle={`Lô B: ${treeCount} cây cá thể · Lô A: ${lotACount} cây`}
            trailing={
              <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                Sẵn sàng
              </StatusPill>
            }
          />
        </div>
      </Dialog>

      <Snackbar items={snackbars} onDismiss={dismissSnackbar} />
    </div>
  );
}

export default App;
