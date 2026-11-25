import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { initDatabase, Ri6Database } from './database';
import {
  createDexieSyncStore,
  isValidGitHubRepo,
  loadSwNotifySettings,
  loadSwSyncConfig,
  saveSwNotifySettings,
} from './syncStore';

describe('Dexie SyncStore (T04)', () => {
  const dbs: Ri6Database[] = [];

  afterEach(async () => {
    for (const d of dbs.splice(0)) {
      d.close();
      await d.delete();
    }
  });

  it('validates owner/repo format strictly', () => {
    expect(isValidGitHubRepo('datnho0804-gif/Ri6-data')).toBe(true);
    expect(isValidGitHubRepo('user.name/repo_1-test')).toBe(true);
    expect(isValidGitHubRepo('https://github.com/datnho0804-gif/Ri6-data')).toBe(false);
    expect(isValidGitHubRepo('Ri6-data')).toBe(false);
    expect(isValidGitHubRepo('owner/repo/extra')).toBe(false);
    expect(isValidGitHubRepo('owner / repo')).toBe(false);
    expect(isValidGitHubRepo('')).toBe(false);
  });

  it('loads and saves all 5 sync collections and collects pending photo uploads', async () => {
    const testDb = new Ri6Database(`ri6-sync-store-${crypto.randomUUID()}`);
    dbs.push(testDb);
    const init = await initDatabase('0.5.0', testDb);
    const store = createDexieSyncStore(testDb);

    const initial = await store.loadState();
    expect(initial.trees).toHaveLength(15);
    expect(initial.lots).toHaveLength(1);
    expect(initial.tasks).toHaveLength(0);

    // Add a local photo with full + thumb blobs (pending upload), an already-uploaded photo,
    // a soft-deleted photo, and a photo with only a thumb: record (no full blob).
    const photoBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const thumbBytes = new Uint8Array([9, 9]);
    await testDb.photoBlobs.bulkPut([
      { id: 'p-1', blob: new Blob([photoBytes], { type: 'image/webp' }) },
      { id: 'thumb:p-1', blob: new Blob([thumbBytes], { type: 'image/webp' }) },
      { id: 'p-uploaded', blob: new Blob([new Uint8Array([7])], { type: 'image/webp' }) },
      { id: 'p-deleted', blob: new Blob([new Uint8Array([8])], { type: 'image/webp' }) },
      { id: 'thumb:p-thumb-only', blob: new Blob([thumbBytes], { type: 'image/webp' }) },
    ]);

    await store.saveState({
      ...initial,
      tasks: [
        {
          id: 'task-1',
          title: 'Kiểm tra béc tưới',
          done: false,
          source: 'manual',
          updatedAt: '2026-11-25T05:00:00.000Z',
          updatedBy: init.settings.deviceId,
        },
      ],
      photos: [
        {
          id: 'p-1',
          targetId: 'SR01',
          takenAt: '2026-11-25',
          kind: 'weekly',
          width: 1600,
          height: 1200,
          bytes: 5,
          updatedAt: '2026-11-25T05:00:00.000Z',
          updatedBy: init.settings.deviceId,
        },
        {
          id: 'p-uploaded',
          targetId: 'SR01',
          takenAt: '2026-11-25',
          kind: 'weekly',
          width: 1600,
          height: 1200,
          bytes: 1,
          remotePath: 'photos/SR01/2026-11-25_p-uploaded.webp',
          updatedAt: '2026-11-25T05:00:00.000Z',
          updatedBy: init.settings.deviceId,
        },
        {
          id: 'p-deleted',
          targetId: 'SR02',
          takenAt: '2026-11-25',
          kind: 'weekly',
          width: 1600,
          height: 1200,
          bytes: 1,
          deletedAt: '2026-11-25T05:01:00.000Z',
          updatedAt: '2026-11-25T05:01:00.000Z',
          updatedBy: init.settings.deviceId,
        },
        {
          id: 'p-thumb-only',
          targetId: 'SR03',
          takenAt: '2026-11-25',
          kind: 'weekly',
          width: 1600,
          height: 1200,
          bytes: 2,
          updatedAt: '2026-11-25T05:00:00.000Z',
          updatedBy: init.settings.deviceId,
        },
      ],
    });

    const reloaded = await store.loadState();
    expect(reloaded.tasks).toHaveLength(1);
    expect(reloaded.tasks[0].title).toBe('Kiểm tra béc tưới');

    const uploads = await store.pendingPhotoUploads();
    expect(uploads).toHaveLength(1);
    expect(uploads[0].photo.id).toBe('p-1');
    expect(uploads[0].mime).toBe('image/webp');
    expect(Array.from(uploads[0].bytes)).toEqual([1, 2, 3, 4, 5]);
  });

  it('loads SW sync config from Dexie settings only when token and valid repo are configured', async () => {
    const testDb = new Ri6Database(`ri6-sync-cfg-${crypto.randomUUID()}`);
    dbs.push(testDb);
    await initDatabase('0.5.0', testDb);

    expect(await loadSwSyncConfig(testDb)).toBeNull();

    // Invalid full URL instead of owner/repo should return null
    await testDb.settings.update('app', {
      githubToken: 'ghp_example_local_only',
      dataRepo: 'https://github.com/datnho0804-gif/Ri6-data',
      dataBranch: 'main',
      deviceName: 'Máy vườn',
      autoSync: true,
    });
    expect(await loadSwSyncConfig(testDb)).toBeNull();

    // Missing slash should also return null
    await testDb.settings.update('app', { dataRepo: 'Ri6-data' });
    expect(await loadSwSyncConfig(testDb)).toBeNull();

    await testDb.settings.update('app', {
      dataRepo: 'datnho0804-gif/Ri6-data',
    });

    const cfg = await loadSwSyncConfig(testDb);
    expect(cfg).not.toBeNull();
    expect(cfg?.repo).toBe('datnho0804-gif/Ri6-data');
    expect(cfg?.deviceName).toBe('Máy vườn');
    expect(cfg?.autoSync).toBe(true);
  });

  it('reads and updates notification settings directly in Dexie for Service Worker (T05 AC5)', async () => {
    const testDb = new Ri6Database(`ri6-notify-cfg-${crypto.randomUUID()}`);
    dbs.push(testDb);
    await initDatabase('0.6.0', testDb);

    expect(await loadSwNotifySettings(testDb)).toEqual({ enabled: false, lastKeys: [] });

    await saveSwNotifySettings(
      {
        enabled: true,
        lastNotifiedAt: '2026-11-25T01:00:00.000Z',
        lastKeys: ['photo:SR01', 'ri6-kali:SR01'],
      },
      testDb,
    );

    expect(await loadSwNotifySettings(testDb)).toEqual({
      enabled: true,
      lastNotifiedAt: '2026-11-25T01:00:00.000Z',
      lastKeys: ['photo:SR01', 'ri6-kali:SR01'],
    });
  });
});
