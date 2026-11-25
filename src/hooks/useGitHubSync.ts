import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDexieSyncStore, isValidGitHubRepo, loadSwSyncConfig } from '../db/syncStore';
import { nowUTC } from '../lib/date';
import { syncOnce, type SyncResult } from '../lib/sync/engine';
import { SYNC_ERROR_LABEL, SyncError, type SyncErrorKind } from '../lib/sync/errors';
import {
  createGitHubClient,
  type GitHubConfig,
  type RepoCheck,
} from '../lib/sync/github';
import {
  createSyncScheduler,
  requestBackgroundSync,
  type SyncScheduler,
} from '../lib/sync/scheduler';
import type { ISOTime, Settings } from '../types/models';

export interface SyncHeaderStatus {
  tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
  shortText: string;
  wideText?: string;
  fullText: string;
  spinning: boolean;
}

export interface RepoTestOutcome {
  ok: boolean;
  repoCheck?: RepoCheck;
  error?: string;
  errorKind?: SyncErrorKind;
}

/**
 * Pure helper computing effective UI pending count when SW Background Sync completes
 * ahead of the page's in-memory scheduler (`createSyncScheduler` has no external reset API).
 */
export function computeEffectivePending(
  schedulerPending: number,
  swAckedBaseline: number,
): number {
  return Math.max(0, schedulerPending - swAckedBaseline);
}

function formatTimeVN(iso: ISOTime): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function shortErrorHeaderLabel(kind: SyncErrorKind): string {
  switch (kind) {
    case 'auth':
      return 'Lỗi: token';
    case 'forbidden':
    case 'not-found':
      return 'Lỗi: quyền';
    case 'network':
    case 'rate-limit':
      return 'Lỗi: mạng';
    case 'conflict':
      return 'Lỗi: xung đột';
    case 'invalid-data':
      return 'Lỗi: dữ liệu';
    default:
      return 'Lỗi đồng bộ';
  }
}

export interface UseGitHubSyncResult {
  isConfigured: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: ISOTime | null;
  lastResult: SyncResult | null;
  lastErrorKind: SyncErrorKind | null;
  lastErrorMessage: string | null;
  headerStatus: SyncHeaderStatus;
  syncNow: () => Promise<SyncResult | null>;
  notifyLocalChange: () => void;
  testConnection: (cfg: GitHubConfig) => Promise<RepoTestOutcome>;
}

/**
 * Coordinates GitHub two-way sync lifecycle in the UI using Claude's pure engine & scheduler
 * (`src/lib/sync/{engine,github,scheduler,errors}.ts`) + Dexie `SyncStore`.
 */
export function useGitHubSync(opts: {
  settings: Settings | null;
  isOnline: boolean;
  onDataPulled: () => Promise<void>;
}): UseGitHubSyncResult {
  const { settings, isOnline, onDataPulled } = opts;

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<ISOTime | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const settingsRef = useRef(settings);
  const isOnlineRef = useRef(isOnline);
  const prevOnlineRef = useRef(isOnline);
  const onlineEventTriggeredRef = useRef(false);
  const onDataPulledRef = useRef(onDataPulled);
  const initialSyncedRef = useRef(false);
  const swAckedPendingRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onDataPulledRef.current = onDataPulled;
  }, [onDataPulled]);

  const isConfigured = Boolean(
    settings?.githubToken?.trim() && isValidGitHubRepo(settings?.dataRepo ?? ''),
  );

  const handleSyncResult = useCallback((result: SyncResult) => {
    setLastResult(result);
    if (result.status === 'ok') {
      setLastSyncedAt(result.at);
      if (result.pulled > 0 || result.uploadedPhotos > 0) {
        void onDataPulledRef.current();
      }
    }
  }, []);

  const schedulerRef = useRef<SyncScheduler | null>(null);

  useEffect(() => {
    const store = createDexieSyncStore();
    const scheduler = createSyncScheduler({
      isOnline: () =>
        isOnlineRef.current && (typeof navigator === 'undefined' || navigator.onLine !== false),
      onRunning: (running) => {
        setIsSyncing(running);
        setPendingCount(
          computeEffectivePending(scheduler.pendingChanges, swAckedPendingRef.current),
        );
      },
      onResult: (res) => {
        if (res.status === 'ok') {
          swAckedPendingRef.current = 0;
        }
        setPendingCount(
          computeEffectivePending(scheduler.pendingChanges, swAckedPendingRef.current),
        );
        handleSyncResult(res);
      },
      run: async (): Promise<SyncResult> => {
        // Read directly from Dexie to avoid stale settingsRef right after saving form edits
        const cfg = await loadSwSyncConfig();
        if (!cfg) {
          return {
            status: 'error',
            kind: 'config',
            message: SYNC_ERROR_LABEL.config,
            at: nowUTC(),
          };
        }
        const client = createGitHubClient({
          token: cfg.token,
          repo: cfg.repo,
          branch: cfg.branch,
        });
        return syncOnce({
          client,
          store,
          deviceId: cfg.deviceId,
          deviceName: cfg.deviceName,
          now: nowUTC,
        });
      },
    });
    schedulerRef.current = scheduler;
    return () => {
      scheduler.dispose();
      schedulerRef.current = null;
    };
  }, [handleSyncResult]);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    const cfg = await loadSwSyncConfig();
    if (!cfg) return null;
    const scheduler = schedulerRef.current;
    if (!scheduler) return null;
    initialSyncedRef.current = true;
    return scheduler.syncNow();
  }, []);

  const notifyLocalChange = useCallback(() => {
    const s = settingsRef.current;
    if (!s?.githubToken?.trim() || !isValidGitHubRepo(s.dataRepo ?? '') || !s.autoSync) return;
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    scheduler.notifyChange();
    setPendingCount(computeEffectivePending(scheduler.pendingChanges, swAckedPendingRef.current));
    void requestBackgroundSync();
  }, []);

  // Layer 1: Track window online/offline synchronously (prevents race with React prop commit)
  useEffect(() => {
    const onOnline = () => {
      isOnlineRef.current = true;
      const s = settingsRef.current;
      if (s?.githubToken?.trim() && isValidGitHubRepo(s.dataRepo ?? '') && s.autoSync) {
        onlineEventTriggeredRef.current = true;
        initialSyncedRef.current = true;
        void syncNow();
      }
    };
    const onOffline = () => {
      isOnlineRef.current = false;
      onlineEventTriggeredRef.current = false;
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncNow]);

  // Layer 2: Sync React isOnline prop + catch offline->online transitions if triggered via prop only
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    isOnlineRef.current = isOnline;
    if (!wasOnline && isOnline) {
      if (onlineEventTriggeredRef.current) {
        onlineEventTriggeredRef.current = false;
        return;
      }
      if (isConfigured && settings?.autoSync) {
        initialSyncedRef.current = true;
        void syncNow();
      }
    }
  }, [isConfigured, isOnline, settings?.autoSync, syncNow]);

  // Trigger 1: On app startup once settings load with autoSync enabled
  useEffect(() => {
    if (!isConfigured || !settings?.autoSync || !isOnline) return;
    if (initialSyncedRef.current) return;
    initialSyncedRef.current = true;
    void syncNow();
  }, [isConfigured, isOnline, settings?.autoSync, syncNow]);

  // Trigger 2: On returning to foreground (visibilitychange)
  useEffect(() => {
    if (!isConfigured || !settings?.autoSync) return;

    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        isOnlineRef.current &&
        (typeof navigator === 'undefined' || navigator.onLine !== false)
      ) {
        void syncNow();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isConfigured, settings?.autoSync, syncNow]);

  // Listen to Background Sync results posted by src/sw/sync.ts
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; result?: SyncResult } | null;
      if (data?.type === 'ri6-sync-result' && data.result) {
        if (data.result.status === 'ok') {
          swAckedPendingRef.current = schedulerRef.current?.pendingChanges ?? 0;
          setPendingCount(0);
        }
        handleSyncResult(data.result);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [handleSyncResult]);

  const testConnection = useCallback(async (cfg: GitHubConfig): Promise<RepoTestOutcome> => {
    try {
      const client = createGitHubClient({
        token: cfg.token.trim(),
        repo: cfg.repo.trim(),
        branch: cfg.branch.trim() || 'main',
      });
      const repoCheck = await client.checkRepo();
      return { ok: true, repoCheck };
    } catch (err) {
      if (err instanceof SyncError) {
        return { ok: false, error: err.message, errorKind: err.kind };
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : SYNC_ERROR_LABEL.unknown,
        errorKind: 'unknown',
      };
    }
  }, []);

  const lastErrorKind = lastResult?.status === 'error' ? lastResult.kind : null;
  const lastErrorMessage = lastResult?.status === 'error' ? lastResult.message : null;

  const headerStatus: SyncHeaderStatus = useMemo(() => {
    if (isSyncing) {
      return {
        tone: 'info',
        shortText: 'Đang đồng bộ…',
        fullText: 'Đang đồng bộ dữ liệu với GitHub…',
        spinning: true,
      };
    }
    if (!isConfigured) {
      return isOnline
        ? {
            tone: 'neutral',
            shortText: '',
            fullText: 'Chưa thiết lập đồng bộ GitHub — bấm để cấu hình',
            spinning: false,
          }
        : {
            tone: 'warn',
            shortText: 'Ngoại tuyến',
            fullText: 'Đang ngoại tuyến — dữ liệu vẫn lưu trên máy',
            spinning: false,
          };
    }
    if (!isOnline) {
      return pendingCount > 0
        ? {
            tone: 'warn',
            shortText: `Chờ mạng (${pendingCount})`,
            wideText: `Chờ mạng (${pendingCount} thay đổi)`,
            fullText: `Chờ mạng (${pendingCount} thay đổi chưa đẩy lên)`,
            spinning: false,
          }
        : {
            tone: 'warn',
            shortText: 'Ngoại tuyến',
            fullText: 'Đang ngoại tuyến — sẽ tự đồng bộ khi có mạng',
            spinning: false,
          };
    }
    if (lastErrorKind && lastErrorMessage) {
      return {
        tone: 'danger',
        shortText: shortErrorHeaderLabel(lastErrorKind),
        fullText: `${lastErrorMessage} — bấm để xem chi tiết`,
        spinning: false,
      };
    }
    if (pendingCount > 0) {
      return {
        tone: 'warn',
        shortText: `Chờ đồng bộ (${pendingCount})`,
        wideText: `Chờ đồng bộ (${pendingCount} thay đổi)`,
        fullText: `Có ${pendingCount} thay đổi chờ đồng bộ tự động`,
        spinning: false,
      };
    }
    if (lastSyncedAt) {
      const hhmm = formatTimeVN(lastSyncedAt);
      return {
        tone: 'ok',
        shortText: `Đã đồng bộ ${hhmm}`,
        fullText: `Đã đồng bộ lúc ${hhmm} — bấm để đồng bộ ngay`,
        spinning: false,
      };
    }
    return {
      tone: 'ok',
      shortText: 'Sẵn sàng',
      fullText: 'Đồng bộ GitHub đã sẵn sàng — bấm để đồng bộ ngay',
      spinning: false,
    };
  }, [isConfigured, isOnline, isSyncing, lastErrorKind, lastErrorMessage, lastSyncedAt, pendingCount]);

  return {
    isConfigured,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    lastResult,
    lastErrorKind,
    lastErrorMessage,
    headerStatus,
    syncNow,
    notifyLocalChange,
    testConnection,
  };
}
