import Dexie, { type EntityTable } from 'dexie';
import { nowUTC } from '../lib/date';
import type {
  AiChat,
  Log,
  Lot,
  Photo,
  PhotoBlobRecord,
  Settings,
  Task,
  Tree,
} from '../types/models';
import {
  createInitialLotA,
  createInitialSettings,
  createInitialTrees,
  generateDeviceId,
  LOT_A_ID,
} from './seed';

export const SCHEMA_VERSION = 1;

export class Ri6Database extends Dexie {
  trees!: EntityTable<Tree, 'id'>;
  lots!: EntityTable<Lot, 'id'>;
  logs!: EntityTable<Log, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  photoBlobs!: EntityTable<PhotoBlobRecord, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  aiChats!: EntityTable<AiChat, 'id'>;

  constructor(name = 'ri6-orchard-db') {
    super(name);
    // SPEC §5 (v1.1): 8 tables; boolean flags (needsPruning, diseaseWatch, done) are filtered in memory
    // because IndexedDB does not index boolean keys.
    this.version(SCHEMA_VERSION).stores({
      trees: 'id, code, lot, health, updatedAt, deletedAt',
      lots: 'id, updatedAt, deletedAt',
      logs: 'id, targetId, date, type, batchId, updatedAt, deletedAt',
      tasks: 'id, targetId, dueDate, updatedAt, deletedAt',
      photos: 'id, targetId, takenAt, kind, updatedAt, deletedAt',
      photoBlobs: 'id',
      settings: 'id',
      aiChats: 'id, updatedAt',
    });
  }
}

export const db = new Ri6Database();

export interface DatabaseInitResult {
  settings: Settings;
  treeCount: number;
  lotACount: number;
  tableCount: number;
  wasUpgradedFromVersion: string | null;
  persistentGranted: boolean;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
  versionError: boolean;
}

type PersistableStorageManager = StorageManager & {
  persist?: () => Promise<boolean>;
};

export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  usage: number | null;
  quota: number | null;
}> {
  let persisted = false;
  let usage: number | null = null;
  let quota: number | null = null;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    const storage = navigator.storage as PersistableStorageManager;
    try {
      if (typeof storage.persisted === 'function') {
        persisted = await storage.persisted();
      }
      if (!persisted && typeof storage.persist === 'function') {
        persisted = await storage.persist();
      }
    } catch {
      persisted = false;
    }

    try {
      if (typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        usage = typeof est.usage === 'number' ? est.usage : null;
        quota = typeof est.quota === 'number' ? est.quota : null;
      }
    } catch {
      usage = null;
      quota = null;
    }
  }

  return { persisted, usage, quota };
}

/**
 * Initializes Dexie DB v1 (SPEC §5 v1.1):
 * - Ensures `settings` row with generated UUID `deviceId` exists
 * - Seeds empty SR01–SR15 and LOT_A ONCE on first run (`seededAt` guard ensures
 *   re-running initDatabase never re-seeds even after trees are added or deleted)
 * - Calls navigator.storage.persist() and estimates quota
 * - Safely handles VersionError without crashing or deleting user data
 */
export async function initDatabase(
  appVersion: string,
  database: Ri6Database = db
): Promise<DatabaseInitResult> {
  const storagePromise = requestPersistentStorage();

  try {
    await database.open();
  } catch (err) {
    const storageInfo = await storagePromise;
    if (err instanceof Error && err.name === 'VersionError') {
      return {
        settings: createInitialSettings(generateDeviceId(), appVersion),
        treeCount: 0,
        lotACount: 0,
        tableCount: database.tables.length,
        wasUpgradedFromVersion: null,
        persistentGranted: storageInfo.persisted,
        storageUsageBytes: storageInfo.usage,
        storageQuotaBytes: storageInfo.quota,
        versionError: true,
      };
    }
    throw err;
  }

  let wasUpgradedFromVersion: string | null = null;

  const settings = await database.transaction(
    'rw',
    [database.settings, database.trees, database.lots],
    async () => {
      let current = await database.settings.get('app');
      const existingTreeCount = await database.trees.count();
      const existingLotA = await database.lots.get(LOT_A_ID);

      if (!current) {
        current = createInitialSettings(generateDeviceId(), appVersion);
      } else {
        if (current.lastSeenVersion && current.lastSeenVersion !== appVersion) {
          wasUpgradedFromVersion = current.lastSeenVersion;
        }
        current = {
          ...current,
          notify: current.notify ?? { enabled: false, lastKeys: [] },
          geminiSchemaUnsupported: current.geminiSchemaUnsupported ?? [],
          hapticsEnabled: current.hapticsEnabled ?? true,
          lastSeenVersion: appVersion,
        };
      }

      // Seed ONLY ONCE on a brand-new database (never re-seed after user edits/deletions)
      const alreadyHasData = Boolean(current.seededAt) || existingTreeCount > 0 || Boolean(existingLotA);
      if (!alreadyHasData) {
        const ts = nowUTC();
        await database.trees.bulkPut(createInitialTrees(current.deviceId, ts));
        await database.lots.put(createInitialLotA(current.deviceId, ts));
        current = { ...current, seededAt: ts };
      } else if (!current.seededAt) {
        current = { ...current, seededAt: nowUTC() };
      }

      await database.settings.put(current);
      return current;
    }
  );

  const [activeTrees, lotA, storageInfo] = await Promise.all([
    database.trees.filter((t) => !t.deletedAt).count(),
    database.lots.get(LOT_A_ID),
    storagePromise,
  ]);

  return {
    settings,
    treeCount: activeTrees,
    lotACount: lotA?.treeCount ?? 0,
    tableCount: database.tables.length,
    wasUpgradedFromVersion,
    persistentGranted: storageInfo.persisted,
    storageUsageBytes: storageInfo.usage,
    storageQuotaBytes: storageInfo.quota,
    versionError: false,
  };
}
