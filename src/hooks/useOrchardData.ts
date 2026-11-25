import { useCallback, useEffect, useRef, useState } from 'react';
import { type DatabaseInitResult, db, initDatabase } from '../db/database';
import { generateDeviceId, LOT_A_ID } from '../db/seed';
import { isValidGitHubRepo } from '../db/syncStore';
import {
  type AgendaItem,
  markDone as markAgendaDonePure,
  newTask as newTaskPure,
  snooze as snoozeAgendaPure,
} from '../lib/agenda/agenda';
import {
  approveMemory as approveMemoryPure,
  createMemory as createMemoryPure,
  deleteMemory as deleteMemoryPure,
  editMemory as editMemoryPure,
  type MemoryProposal,
} from '../lib/ai/memory';
import { tombstoneBatch } from '../lib/batchLogs';
import { nowUTC, todayVN } from '../lib/date';
import { splitFromLotA as splitFromLotAPure } from '../lib/lotSplit';
import type { SyncState } from '../lib/merge';
import { filterTrees } from '../lib/treeFilters';
import type {
  AiMemory,
  ISODate,
  Log,
  Lot,
  Photo,
  PhotoKind,
  Season,
  Settings,
  Stage,
  Task,
  TaskSource,
  Tree,
} from '../types/models';

const THUMB_KEY_PREFIX = 'thumb:';
const thumbKey = (photoId: string) => `${THUMB_KEY_PREFIX}${photoId}`;

export interface OrchardDataHook {
  loading: boolean;
  dbState: DatabaseInitResult | null;
  settings: Settings | null;
  trees: Tree[];
  allTrees: Tree[];
  lotA: Lot | null;
  logs: Log[];
  tasks: Task[];
  photos: Photo[];
  aiMemories: AiMemory[];
  thumbUrls: Map<string, string>;
  refresh: (opts?: { resetPhotoErrors?: boolean }) => Promise<void>;
  getPhotoFullUrl: (photoId: string) => Promise<string | null>;
  ensureRemotePhoto: (photoId: string, forceRetry?: boolean) => Promise<void>;
  addTree: (input: { code: string; lot: 'A' | 'B'; label: string; location: string; ageYears: number | null }) => Promise<Tree>;
  updateTree: (tree: Tree, patch: Partial<Tree>) => Promise<Tree>;
  softDeleteTree: (tree: Tree) => Promise<void>;
  updateLotA: (patch: { stage?: Stage | null; note?: string }) => Promise<void>;
  splitFromLotA: (count: number) => Promise<{ ok: boolean; error?: string; createdCount: number }>;
  saveLogs: (newLogs: Log[]) => Promise<void>;
  deleteSingleLog: (log: Log) => Promise<Log>;
  undoDeleteLog: (deletedLog: Log) => Promise<void>;
  deleteBatchById: (batchId: string) => Promise<number>;
  markAgendaItemDone: (item: AgendaItem) => Promise<{ prev: Task | undefined; saved: Task }>;
  snoozeAgendaItem: (item: AgendaItem, days?: number) => Promise<{ prev: Task | undefined; saved: Task }>;
  addManualTask: (input: {
    title: string;
    dueDate: ISODate;
    targetId?: string;
    source?: Exclude<TaskSource, 'rule'>;
  }) => Promise<Task>;
  restoreTaskSnapshot: (prev: Task | undefined, taskId: string) => Promise<void>;
  addAiMemory: (
    proposal: MemoryProposal & { source: AiMemory['source']; approved?: boolean },
  ) => Promise<AiMemory>;
  approveAiMemory: (memory: AiMemory) => Promise<AiMemory>;
  editAiMemory: (
    memory: AiMemory,
    patch: Partial<Pick<AiMemory, 'content' | 'category' | 'targetIds'>>,
  ) => Promise<AiMemory>;
  deleteAiMemory: (memory: AiMemory) => Promise<AiMemory>;
  undoDeleteAiMemory: (deletedMemory: AiMemory) => Promise<void>;
  saveCapturedPhoto: (targetId: string, file: File, kind?: PhotoKind) => Promise<Photo>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setSeasonOverride: (season: Season | null) => Promise<void>;
  exportBackupJson: (includePhotos: boolean) => Promise<string>;
  applyImportedBackup: (incoming: SyncState, photoData?: Record<string, string>) => Promise<void>;
  getOrchardStateSnapshot: () => Promise<SyncState>;
}

function mimeFromRemotePath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

/**
 * Central Dexie IndexedDB data & mutations hook for Sổ Tay Vườn Ri6.
 * Keeps UI strictly synchronized with IndexedDB, triggers sync notifications on local mutations,
 * and downloads remote photos from GitHub on demand when viewed online.
 */
export function useOrchardData(
  appVersion: string,
  onStartupNotice: (notice: { message: string; tone: 'ok' | 'danger' }) => void,
  onDataChanged?: () => void,
): OrchardDataHook {
  const [loading, setLoading] = useState(true);
  const [dbState, setDbState] = useState<DatabaseInitResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allTrees, setAllTrees] = useState<Tree[]>([]);
  const [lotA, setLotA] = useState<Lot | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [aiMemories, setAiMemories] = useState<AiMemory[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(() => new Map());

  const thumbUrlCacheRef = useRef<Map<string, string>>(new Map());
  const fullUrlCacheRef = useRef<Map<string, string>>(new Map());
  const remoteFetchInFlightRef = useRef<Map<string, Promise<Blob | null>>>(new Map());
  const remoteFetchFailedRef = useRef<Set<string>>(new Set());
  const onStartupNoticeRef = useRef(onStartupNotice);
  const onDataChangedRef = useRef(onDataChanged);
  useEffect(() => {
    onStartupNoticeRef.current = onStartupNotice;
    onDataChangedRef.current = onDataChanged;
  });

  const emitDataChanged = useCallback(() => {
    onDataChangedRef.current?.();
  }, []);

  const loadAll = useCallback(async (opts?: { resetPhotoErrors?: boolean }) => {
    if (opts?.resetPhotoErrors) {
      remoteFetchFailedRef.current.clear();
    }
    const [s, tList, lot, lList, tkList, pList, mList] = await Promise.all([
      db.settings.get('app'),
      db.trees.toArray(),
      db.lots.get(LOT_A_ID),
      db.logs.toArray(),
      db.tasks.toArray(),
      db.photos.toArray(),
      db.aiMemories.toArray(),
    ]);

    if (s) setSettings(s);
    setAllTrees(tList);
    setLotA(lot ?? null);
    setLogs(lList);
    setTasks(tkList);
    setPhotos(pList);
    setAiMemories(mList.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));

    // Load local 480px thumbnails (or fallback to full blob if thumb missing) for active photos
    const activePhotos = pList.filter((p) => !p.deletedAt);
    const activeIds = new Set(activePhotos.map((p) => p.id));

    // Revoke removed photo Object URLs
    const cache = thumbUrlCacheRef.current;
    for (const [id, url] of cache.entries()) {
      if (!activeIds.has(id)) {
        URL.revokeObjectURL(url);
        cache.delete(id);
      }
    }

    const missingIds = activePhotos.map((p) => p.id).filter((id) => !cache.has(id));
    if (missingIds.length > 0) {
      const thumbKeys = missingIds.map(thumbKey);
      const thumbRecords = await db.photoBlobs.bulkGet(thumbKeys);
      const stillMissing: string[] = [];

      missingIds.forEach((photoId, idx) => {
        const rec = thumbRecords[idx];
        if (rec?.blob) {
          cache.set(photoId, URL.createObjectURL(rec.blob));
        } else {
          stillMissing.push(photoId);
        }
      });

      if (stillMissing.length > 0) {
        const fullRecords = await db.photoBlobs.bulkGet(stillMissing);
        stillMissing.forEach((photoId, idx) => {
          const rec = fullRecords[idx];
          if (rec?.blob) {
            cache.set(photoId, URL.createObjectURL(rec.blob));
          }
        });
      }
    }

    setThumbUrls(new Map(cache));
  }, []);

  useEffect(() => {
    let mounted = true;
    initDatabase(appVersion)
      .then(async (result) => {
        if (!mounted) return;
        setDbState(result);
        setSettings(result.settings);
        if (result.versionError) {
          onStartupNoticeRef.current({
            message: 'Cần cập nhật ứng dụng để đọc dữ liệu mới hơn.',
            tone: 'danger',
          });
        } else {
          if (result.wasUpgradedFromVersion) {
            onStartupNoticeRef.current({
              message: `Đã cập nhật lên v${appVersion}`,
              tone: 'ok',
            });
          }
          await loadAll();
        }
        if (mounted) setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        onStartupNoticeRef.current({
          message: 'Không thể khởi tạo dữ liệu ngoại tuyến trên thiết bị này.',
          tone: 'danger',
        });
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [appVersion, loadAll]);

  useEffect(() => {
    const thumbCache = thumbUrlCacheRef.current;
    const fullCache = fullUrlCacheRef.current;
    return () => {
      for (const url of thumbCache.values()) URL.revokeObjectURL(url);
      for (const url of fullCache.values()) URL.revokeObjectURL(url);
      thumbCache.clear();
      fullCache.clear();
    };
  }, []);

  const deviceId = settings?.deviceId ?? dbState?.settings.deviceId ?? 'local-device';

  const downloadRemotePhotoBlob = useCallback(
    async (photoId: string, forceRetry = false): Promise<Blob | null> => {
      if (forceRetry) {
        remoteFetchFailedRef.current.delete(photoId);
      } else if (remoteFetchFailedRef.current.has(photoId)) {
        return null;
      }

      const existing = await db.photoBlobs.get(photoId);
      if (existing?.blob) return existing.blob;

      const inflight = remoteFetchInFlightRef.current.get(photoId);
      if (inflight) return inflight;

      const task = (async (): Promise<Blob | null> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
        const [photo, s] = await Promise.all([db.photos.get(photoId), db.settings.get('app')]);
        if (
          !photo?.remotePath ||
          !s?.githubToken?.trim() ||
          !isValidGitHubRepo(s.dataRepo ?? '')
        ) {
          return null;
        }

        try {
          const { createGitHubClient } = await import('../lib/sync/github');
          const client = createGitHubClient({
            token: s.githubToken.trim(),
            repo: s.dataRepo.trim(),
            branch: s.dataBranch?.trim() || 'main',
          });
          const bytes = await client.getBytes(photo.remotePath);
          if (!bytes) {
            remoteFetchFailedRef.current.add(photoId);
            return null;
          }
          remoteFetchFailedRef.current.delete(photoId);
          const copy = new Uint8Array(bytes.byteLength);
          copy.set(bytes);
          const blob = new Blob([copy], { type: mimeFromRemotePath(photo.remotePath) });
          await db.photoBlobs.put({ id: photoId, blob });
          const objUrl = URL.createObjectURL(blob);
          thumbUrlCacheRef.current.set(photoId, objUrl);
          setThumbUrls(new Map(thumbUrlCacheRef.current));
          return blob;
        } catch {
          remoteFetchFailedRef.current.add(photoId);
          return null;
        } finally {
          remoteFetchInFlightRef.current.delete(photoId);
        }
      })();

      remoteFetchInFlightRef.current.set(photoId, task);
      return task;
    },
    [],
  );

  const ensureRemotePhoto = useCallback(
    async (photoId: string, forceRetry = false): Promise<void> => {
      if (thumbUrlCacheRef.current.has(photoId)) return;
      await downloadRemotePhotoBlob(photoId, forceRetry);
    },
    [downloadRemotePhotoBlob],
  );

  const getPhotoFullUrl = useCallback(
    async (photoId: string): Promise<string | null> => {
      const cached = fullUrlCacheRef.current.get(photoId);
      if (cached) return cached;
      let blob = (await db.photoBlobs.get(photoId))?.blob ?? null;
      if (!blob) {
        blob = await downloadRemotePhotoBlob(photoId, true);
      }
      if (!blob) return thumbUrlCacheRef.current.get(photoId) ?? null;
      const url = URL.createObjectURL(blob);
      fullUrlCacheRef.current.set(photoId, url);
      return url;
    },
    [downloadRemotePhotoBlob],
  );

  const addTree = useCallback(
    async (input: {
      code: string;
      lot: 'A' | 'B';
      label: string;
      location: string;
      ageYears: number | null;
    }) => {
      const now = nowUTC();
      const cleanCode = input.code.trim() || 'SR';
      const tree: Tree = {
        id: generateDeviceId(),
        code: cleanCode,
        lot: input.lot,
        label: input.label.trim() || cleanCode,
        location: input.location.trim(),
        ageYears: input.ageYears,
        stage: null,
        health: 'tot',
        needsPruning: false,
        diseaseWatch: false,
        updatedAt: now,
        updatedBy: deviceId,
      };
      await db.trees.put(tree);
      await loadAll();
      emitDataChanged();
      return tree;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const updateTree = useCallback(
    async (tree: Tree, patch: Partial<Tree>) => {
      const updated: Tree = {
        ...tree,
        ...patch,
        updatedAt: nowUTC(),
        updatedBy: deviceId,
      };
      await db.trees.put(updated);
      await loadAll();
      emitDataChanged();
      return updated;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const softDeleteTree = useCallback(
    async (tree: Tree) => {
      const now = nowUTC();
      await db.trees.put({
        ...tree,
        deletedAt: now,
        updatedAt: now,
        updatedBy: deviceId,
      });
      await loadAll();
      emitDataChanged();
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const updateLotA = useCallback(
    async (patch: { stage?: Stage | null; note?: string }) => {
      const current = await db.lots.get(LOT_A_ID);
      if (!current) return;
      await db.lots.put({
        ...current,
        ...patch,
        updatedAt: nowUTC(),
        updatedBy: deviceId,
      });
      await loadAll();
      emitDataChanged();
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const splitFromLotA = useCallback(
    async (count: number) => {
      const currentLotA = await db.lots.get(LOT_A_ID);
      if (!currentLotA) {
        return { ok: false, error: 'Không tìm thấy hồ sơ Lô A.', createdCount: 0 };
      }
      const existingTrees = await db.trees.toArray();
      const res = splitFromLotAPure(currentLotA, existingTrees, count, {
        deviceId,
        today: todayVN(),
        now: nowUTC(),
        newId: generateDeviceId,
      });
      if (!res.ok) {
        return { ok: false, error: res.error, createdCount: 0 };
      }
      await db.transaction('rw', [db.lots, db.trees, db.logs], async () => {
        await db.lots.put(res.lot);
        await db.trees.bulkPut(res.newTrees);
        await db.logs.put(res.log);
      });
      await loadAll();
      emitDataChanged();
      return { ok: true, createdCount: res.newTrees.length };
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const saveLogs = useCallback(
    async (newLogs: Log[]) => {
      if (newLogs.length === 0) return;
      await db.logs.bulkPut(newLogs);
      await loadAll();
      emitDataChanged();
    },
    [emitDataChanged, loadAll],
  );

  const deleteSingleLog = useCallback(
    async (log: Log) => {
      const now = nowUTC();
      const tomb: Log = { ...log, deletedAt: now, updatedAt: now, updatedBy: deviceId };
      await db.logs.put(tomb);
      await loadAll();
      emitDataChanged();
      return tomb;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const undoDeleteLog = useCallback(
    async (deletedLog: Log) => {
      const { deletedAt: _removed, ...rest } = deletedLog;
      void _removed;
      const restored: Log = { ...rest, updatedAt: nowUTC(), updatedBy: deviceId };
      await db.logs.put(restored);
      await loadAll();
      emitDataChanged();
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const deleteBatchById = useCallback(
    async (batchId: string) => {
      const allLogs = await db.logs.toArray();
      const tombstones = tombstoneBatch(allLogs, batchId, deviceId, nowUTC());
      if (tombstones.length > 0) {
        await db.logs.bulkPut(tombstones);
        await loadAll();
        emitDataChanged();
      }
      return tombstones.length;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const saveCapturedPhoto = useCallback(
    async (targetId: string, file: File, kind: PhotoKind = 'weekly') => {
      const { compressTreePhoto, thumbBlobId } = await import('./photoCapture');
      const compressed = await compressTreePhoto(file);
      const id = generateDeviceId();
      const now = nowUTC();
      const photo: Photo = {
        id,
        targetId,
        takenAt: todayVN(),
        kind,
        width: compressed.width,
        height: compressed.height,
        bytes: compressed.bytes,
        updatedAt: now,
        updatedBy: deviceId,
      };
      await db.transaction('rw', [db.photos, db.photoBlobs], async () => {
        await db.photos.put(photo);
        await db.photoBlobs.bulkPut([
          { id, blob: compressed.fullBlob },
          { id: thumbBlobId(id), blob: compressed.thumbBlob },
        ]);
      });
      await loadAll();
      emitDataChanged();
      return photo;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (
        patch.githubToken !== undefined ||
        patch.dataRepo !== undefined ||
        patch.dataBranch !== undefined
      ) {
        remoteFetchFailedRef.current.clear();
      }
      await db.settings.update('app', patch);
      const next = await db.settings.get('app');
      if (next) setSettings(next);
    },
    [],
  );

  const setSeasonOverride = useCallback(
    async (season: Season | null) => {
      await updateSettings({ seasonOverride: season });
    },
    [updateSettings],
  );

  const getOrchardStateSnapshot = useCallback(async (): Promise<SyncState> => {
    const [tList, lotList, lList, tkList, pList, mList] = await Promise.all([
      db.trees.toArray(),
      db.lots.toArray(),
      db.logs.toArray(),
      db.tasks.toArray(),
      db.photos.toArray(),
      db.aiMemories.toArray(),
    ]);
    return {
      trees: tList,
      lots: lotList,
      logs: lList,
      tasks: tkList,
      photos: pList,
      aiMemories: mList,
    };
  }, []);

  const exportBackupJson = useCallback(
    async (includePhotos: boolean): Promise<string> => {
      const [{ buildExport }, snapshot] = await Promise.all([
        import('../lib/exportImport'),
        getOrchardStateSnapshot(),
      ]);
      let photoData: Record<string, string> | undefined;

      if (includePhotos) {
        const { blobToDataUrl } = await import('./photoCapture');
        photoData = {};
        const activePhotos = snapshot.photos.filter((p) => !p.deletedAt);
        for (const p of activePhotos) {
          const rec = await db.photoBlobs.get(p.id);
          if (rec?.blob) {
            photoData[p.id] = await blobToDataUrl(rec.blob);
          }
        }
      }

      const payload = buildExport(snapshot, {
        exportedAt: nowUTC(),
        appVersion,
        photoData,
      });
      return JSON.stringify(payload, null, 2);
    },
    [appVersion, getOrchardStateSnapshot],
  );

  const applyImportedBackup = useCallback(
    async (incoming: SyncState, photoData?: Record<string, string>) => {
      const [{ mergeState }, local] = await Promise.all([
        import('../lib/merge'),
        getOrchardStateSnapshot(),
      ]);
      const merged = mergeState(local, incoming);

      let blobRecords: Array<{ id: string; blob: Blob }> = [];
      if (photoData && Object.keys(photoData).length > 0) {
        const { dataUrlToBlob } = await import('./photoCapture');
        blobRecords = Object.entries(photoData).map(([id, dataUrl]) => ({
          id,
          blob: dataUrlToBlob(dataUrl),
        }));
      }

      await db.transaction(
        'rw',
        [db.trees, db.lots, db.logs, db.tasks, db.photos, db.photoBlobs, db.aiMemories],
        async () => {
          if (merged.trees.length > 0) await db.trees.bulkPut(merged.trees);
          if (merged.lots.length > 0) await db.lots.bulkPut(merged.lots);
          if (merged.logs.length > 0) await db.logs.bulkPut(merged.logs);
          if (merged.tasks.length > 0) await db.tasks.bulkPut(merged.tasks);
          if (merged.photos.length > 0) await db.photos.bulkPut(merged.photos);
          if (merged.aiMemories && merged.aiMemories.length > 0) {
            await db.aiMemories.bulkPut(merged.aiMemories);
          }
          if (blobRecords.length > 0) await db.photoBlobs.bulkPut(blobRecords);
        },
      );

      await loadAll();
      emitDataChanged();
    },
    [emitDataChanged, getOrchardStateSnapshot, loadAll],
  );

  const markAgendaItemDone = useCallback(
    async (item: AgendaItem) => {
      const taskId = item.category === 'task' ? item.key.slice(5) : item.key;
      const prev = await db.tasks.get(taskId);
      const saved = markAgendaDonePure(item, prev, { deviceId, now: nowUTC() });
      await db.tasks.put(saved);
      await loadAll();
      emitDataChanged();
      return { prev, saved };
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const snoozeAgendaItem = useCallback(
    async (item: AgendaItem, days = 1) => {
      const taskId = item.category === 'task' ? item.key.slice(5) : item.key;
      const prev = await db.tasks.get(taskId);
      const saved = snoozeAgendaPure(
        item,
        prev,
        { deviceId, now: nowUTC(), today: todayVN() },
        days,
      );
      await db.tasks.put(saved);
      await loadAll();
      emitDataChanged();
      return { prev, saved };
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const addManualTask = useCallback(
    async (input: {
      title: string;
      dueDate: ISODate;
      targetId?: string;
      source?: Exclude<TaskSource, 'rule'>;
    }) => {
      const created = newTaskPure(
        {
          title: input.title,
          dueDate: input.dueDate,
          targetId: input.targetId || undefined,
          source: input.source ?? 'manual',
        },
        { deviceId, now: nowUTC(), newId: generateDeviceId },
      );
      await db.tasks.put(created);
      await loadAll();
      emitDataChanged();
      return created;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const restoreTaskSnapshot = useCallback(
    async (prev: Task | undefined, taskId: string) => {
      if (prev) {
        await db.tasks.put({ ...prev, updatedAt: nowUTC(), updatedBy: deviceId });
      } else {
        await db.tasks.delete(taskId);
      }
      await loadAll();
      emitDataChanged();
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const addAiMemory = useCallback(
    async (proposal: MemoryProposal & { source: AiMemory['source']; approved?: boolean }) => {
      const created = createMemoryPure(proposal, {
        id: generateDeviceId(),
        now: nowUTC(),
        deviceId,
      });
      await db.aiMemories.put(created);
      await loadAll();
      emitDataChanged();
      return created;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const approveAiMemory = useCallback(
    async (memory: AiMemory) => {
      const updated = approveMemoryPure(memory, { now: nowUTC(), deviceId });
      await db.aiMemories.put(updated);
      await loadAll();
      emitDataChanged();
      return updated;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const editAiMemory = useCallback(
    async (
      memory: AiMemory,
      patch: Partial<Pick<AiMemory, 'content' | 'category' | 'targetIds'>>,
    ) => {
      const updated = editMemoryPure(memory, patch, { now: nowUTC(), deviceId });
      await db.aiMemories.put(updated);
      await loadAll();
      emitDataChanged();
      return updated;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const deleteAiMemory = useCallback(
    async (memory: AiMemory) => {
      const tomb = deleteMemoryPure(memory, { now: nowUTC(), deviceId });
      await db.aiMemories.put(tomb);
      await loadAll();
      emitDataChanged();
      return tomb;
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const undoDeleteAiMemory = useCallback(
    async (deletedMemory: AiMemory) => {
      const { deletedAt: _removed, ...rest } = deletedMemory;
      void _removed;
      const restored: AiMemory = { ...rest, updatedAt: nowUTC(), updatedBy: deviceId };
      await db.aiMemories.put(restored);
      await loadAll();
      emitDataChanged();
    },
    [deviceId, emitDataChanged, loadAll],
  );

  const activeTrees = filterTrees(
    allTrees,
    { filter: 'all' },
    { today: todayVN(), lastWeekly: new Map() },
  );

  return {
    loading,
    dbState,
    settings,
    trees: activeTrees,
    allTrees,
    lotA,
    logs,
    tasks,
    photos,
    aiMemories,
    thumbUrls,
    refresh: loadAll,
    getPhotoFullUrl,
    ensureRemotePhoto,
    addTree,
    updateTree,
    softDeleteTree,
    updateLotA,
    splitFromLotA,
    saveLogs,
    deleteSingleLog,
    undoDeleteLog,
    deleteBatchById,
    markAgendaItemDone,
    snoozeAgendaItem,
    addManualTask,
    restoreTaskSnapshot,
    addAiMemory,
    approveAiMemory,
    editAiMemory,
    deleteAiMemory,
    undoDeleteAiMemory,
    saveCapturedPhoto,
    updateSettings,
    setSeasonOverride,
    exportBackupJson,
    applyImportedBackup,
    getOrchardStateSnapshot,
  };
}
