import type { SyncState } from '../lib/merge';
import type { SyncStore } from '../lib/sync/engine';
import type { SwSyncConfig } from '../sw/sync';
import type { NotifySettings } from '../types/models';
import { db, type Ri6Database } from './database';

/**
 * Dexie implementation of Claude's `SyncStore` (`src/lib/sync/engine.ts`).
 * Strictly avoids DOM/window/localStorage so the exact same code runs inside `src/sw.ts`.
 */
export function createDexieSyncStore(database: Ri6Database = db): SyncStore {
  return {
    async loadState(): Promise<SyncState> {
      const [trees, lots, logs, tasks, photos, aiMemories] = await Promise.all([
        database.trees.toArray(),
        database.lots.toArray(),
        database.logs.toArray(),
        database.tasks.toArray(),
        database.photos.toArray(),
        database.aiMemories.toArray(),
      ]);
      return { trees, lots, logs, tasks, photos, aiMemories };
    },

    async saveState(state: SyncState): Promise<void> {
      await database.transaction(
        'rw',
        [
          database.trees,
          database.lots,
          database.logs,
          database.tasks,
          database.photos,
          database.aiMemories,
        ],
        async () => {
          if (state.trees.length > 0) await database.trees.bulkPut(state.trees);
          if (state.lots.length > 0) await database.lots.bulkPut(state.lots);
          if (state.logs.length > 0) await database.logs.bulkPut(state.logs);
          if (state.tasks.length > 0) await database.tasks.bulkPut(state.tasks);
          if (state.photos.length > 0) await database.photos.bulkPut(state.photos);
          if (state.aiMemories && state.aiMemories.length > 0) {
            await database.aiMemories.bulkPut(state.aiMemories);
          }
        },
      );
    },

    async pendingPhotoUploads() {
      const photos = await database.photos.toArray();
      const pending = photos.filter((p) => !p.deletedAt && !p.remotePath);
      if (pending.length === 0) return [];

      const blobRecords = await database.photoBlobs.bulkGet(pending.map((p) => p.id));
      const uploads: Array<{
        photo: (typeof pending)[number];
        bytes: Uint8Array;
        mime: string;
      }> = [];

      for (let i = 0; i < pending.length; i += 1) {
        const rec = blobRecords[i];
        if (!rec?.blob) continue;
        const buf = await rec.blob.arrayBuffer();
        uploads.push({
          photo: pending[i],
          bytes: new Uint8Array(buf),
          mime: rec.blob.type || 'image/webp',
        });
      }
      return uploads;
    },
  };
}

/** Matches `owner/repo` format enforced by `src/lib/sync/github.ts`. */
export const GITHUB_REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export function isValidGitHubRepo(repo: string): boolean {
  return GITHUB_REPO_RE.test(repo.trim());
}

/**
 * Reads local-only GitHub sync settings directly from Dexie `settings` table (works in SW & UI).
 */
export async function loadSwSyncConfig(database: Ri6Database = db): Promise<SwSyncConfig | null> {
  const s = await database.settings.get('app');
  if (!s) return null;
  const token = s.githubToken?.trim() ?? '';
  const repo = s.dataRepo?.trim() ?? '';
  if (!token || !isValidGitHubRepo(repo)) return null;
  return {
    token,
    repo,
    branch: s.dataBranch?.trim() || 'main',
    deviceId: s.deviceId,
    deviceName: s.deviceName?.trim() || 'Thiết bị Ri6',
    autoSync: s.autoSync,
  };
}

/**
 * Reads local-only notification preferences directly from Dexie `settings` table (works in SW & UI).
 */
export async function loadSwNotifySettings(
  database: Ri6Database = db,
): Promise<NotifySettings | null> {
  const s = await database.settings.get('app');
  return s?.notify ?? null;
}

/**
 * Persists notification delivery metadata (`lastNotifiedAt`, `lastKeys`) back to Dexie `settings` (works in SW & UI).
 */
export async function saveSwNotifySettings(
  notify: NotifySettings,
  database: Ri6Database = db,
): Promise<void> {
  await database.settings.update('app', { notify });
}
