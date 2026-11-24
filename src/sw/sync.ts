/// <reference lib="webworker" />
import { syncOnce, type SyncResult, type SyncStore } from '../lib/sync/engine';
import { createGitHubClient, type GitHubConfig } from '../lib/sync/github';
import { SYNC_TAG } from '../lib/sync/constants';

/** Cấu hình đọc từ bảng Dexie `settings` (SW không đọc được localStorage). */
export interface SwSyncConfig extends GitHubConfig {
  deviceId: string;
  deviceName: string;
  autoSync: boolean;
}

/** Background Sync chưa có trong lib TypeScript chuẩn. */
interface SyncEventLike extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance?: boolean;
}

/** Lỗi đáng để trình duyệt tự thử lại sau (ném lỗi trong waitUntil). */
const RETRYABLE = new Set(['network', 'conflict', 'rate-limit', 'unknown']);

/**
 * Gắn xử lý sự kiện `sync` (tag `ri6-sync`) — SPEC §6 "Đồng bộ nền", T04 AC8.
 * `src/sw.ts` (Antigravity) gọi: `registerBackgroundSync(self, { store, loadConfig })`
 * với `store`/`loadConfig` hiện thực bằng Dexie.
 * Kết quả được gửi tới mọi tab đang mở: `{ type: 'ri6-sync-result', result }`.
 */
export function registerBackgroundSync(
  sw: ServiceWorkerGlobalScope,
  deps: { store: SyncStore; loadConfig: () => Promise<SwSyncConfig | null>; now?: () => string },
): void {
  const now = deps.now ?? (() => new Date().toISOString());

  async function run(lastChance: boolean): Promise<void> {
    const cfg = await deps.loadConfig();
    if (!cfg || !cfg.autoSync || !cfg.token) return;
    const result: SyncResult = await syncOnce({
      client: createGitHubClient(cfg, (i, init) => sw.fetch(i, init)),
      store: deps.store,
      deviceId: cfg.deviceId,
      deviceName: cfg.deviceName,
      now,
    });
    const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) c.postMessage({ type: 'ri6-sync-result', result });
    if (result.status === 'error' && RETRYABLE.has(result.kind) && !lastChance) {
      throw new Error(`ri6-sync: ${result.kind}`); // trình duyệt sẽ thử lại sau
    }
  }

  sw.addEventListener('sync', (event: Event) => {
    const e = event as SyncEventLike;
    if (e.tag !== SYNC_TAG) return;
    e.waitUntil(run(e.lastChance === true));
  });
}
