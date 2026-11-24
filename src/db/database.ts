import Dexie, { type EntityTable } from 'dexie';
import { nowUTC } from '../lib/date';
import type { Log, Lot, Photo, PhotoBlobRecord, Settings, Tree } from '../types/models';
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
  photos!: EntityTable<Photo, 'id'>;
  photoBlobs!: EntityTable<PhotoBlobRecord, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'ri6-orchard-db') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      trees: 'id, lot, health, needsPruning, diseaseWatch, updatedAt, deletedAt',
      lots: 'id, updatedAt, deletedAt',
      logs: 'id, targetId, date, type, updatedAt, deletedAt',
      photos: 'id, targetId, takenAt, kind, updatedAt, deletedAt',
      photoBlobs: 'id',
      settings: 'id',
    });
  }
}

export const db = new Ri6Database();

export interface DatabaseInitResult {
  settings: Settings;
  treeCount: number;
  lotACount: number;
  wasUpgradedFromVersion: string | null;
  persistentGranted: boolean;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
  versionError: boolean;
}

export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  usage: number | null;
  quota: number | null;
}> {
  let persisted = false;
  let usage: number | null = null;
  let quota: number | null = null;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (typeof navigator.storage.persisted === 'function') {
        persisted = await navigator.storage.persisted();
      }
      if (!persisted && typeof navigator.storage.persist === 'function') {
        persisted = await navigator.storage.persist();
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
 * Initializes Dexie DB v1:
 * - Ensures `settings` row with generated UUID `deviceId` exists
 * - Seeds empty SR01–SR15 and LOT_A (50 trees) on first run
 * - Calls navigator.storage.persist() and estimates quota
 * - Safely handles VersionError without crashing or clearing user data
 */
export async function initDatabase(appVersion: string): Promise<DatabaseInitResult> {
  const storageInfo = await requestPersistentStorage();

  try {
    await db.open();
  } catch (err) {
    if (err instanceof Error && err.name === 'VersionError') {
      return {
        settings: createInitialSettings(generateDeviceId(), appVersion),
        treeCount: 0,
        lotACount: 0,
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

  const settings = await db.transaction(
    'rw',
    [db.settings, db.trees, db.lots],
    async () => {
      let current = await db.settings.get('app');
      if (!current) {
        current = createInitialSettings(generateDeviceId(), appVersion);
        await db.settings.put(current);
      } else if (current.lastSeenVersion && current.lastSeenVersion !== appVersion) {
        wasUpgradedFromVersion = current.lastSeenVersion;
        current = { ...current, lastSeenVersion: appVersion };
        await db.settings.put(current);
      } else if (!current.lastSeenVersion) {
        current = { ...current, lastSeenVersion: appVersion };
        await db.settings.put(current);
      }

      const existingTreeCount = await db.trees.count();
      if (existingTreeCount === 0) {
        const ts = nowUTC();
        await db.trees.bulkPut(createInitialTrees(current.deviceId, ts));
      }

      const existingLotA = await db.lots.get(LOT_A_ID);
      if (!existingLotA) {
        const ts = nowUTC();
        await db.lots.put(createInitialLotA(current.deviceId, ts));
      }

      return current;
    }
  );

  const treeCount = await db.trees.count();
  const lotA = await db.lots.get(LOT_A_ID);

  return {
    settings,
    treeCount,
    lotACount: lotA?.treeCount ?? 0,
    wasUpgradedFromVersion,
    persistentGranted: storageInfo.persisted,
    storageUsageBytes: storageInfo.usage,
    storageQuotaBytes: storageInfo.quota,
    versionError: false,
  };
}
