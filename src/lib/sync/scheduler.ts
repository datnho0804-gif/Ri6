import { SYNC_DEBOUNCE_MS, SYNC_TAG } from './constants';
import type { SyncResult } from './engine';

export { SYNC_DEBOUNCE_MS, SYNC_TAG };

export interface SyncSchedulerOptions {
  run: () => Promise<SyncResult>;
  isOnline: () => boolean;
  onResult?: (r: SyncResult) => void;
  /** Gọi khi trạng thái chạy thay đổi (để header hiện "Đang đồng bộ…"). */
  onRunning?: (running: boolean) => void;
  debounceMs?: number;
}

/**
 * Điều phối thời điểm đồng bộ trên trang (SPEC §6):
 * - `syncNow()`: khi mở app, quay lại foreground, có mạng lại, bấm "Đồng bộ ngay";
 * - `notifyChange()`: sau mỗi lần ghi dữ liệu → chạy sau 30 giây yên lặng;
 * - chỉ một lượt chạy cùng lúc; có thay đổi trong lúc đang chạy → chạy thêm 1 lượt sau đó;
 * - offline → giữ hàng chờ (`pendingChanges`) tới khi có mạng.
 * Không dùng React/Dexie; UI gắn vào các sự kiện của trình duyệt.
 */
export function createSyncScheduler(opts: SyncSchedulerOptions) {
  const debounceMs = opts.debounceMs ?? SYNC_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<SyncResult | null> | null = null;
  let again = false;
  let pendingChanges = 0;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  async function syncNow(): Promise<SyncResult | null> {
    clear();
    if (!opts.isOnline()) return null;
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      opts.onRunning?.(true);
      const once = async (): Promise<SyncResult> => {
        again = false;
        const before = pendingChanges;
        const r = await opts.run();
        if (r.status === 'ok') pendingChanges = Math.max(0, pendingChanges - before);
        opts.onResult?.(r);
        return r;
      };
      let result: SyncResult;
      try {
        result = await once();
        while (again && opts.isOnline()) result = await once();
      } finally {
        running = null;
        opts.onRunning?.(false);
      }
      return result;
    })();
    return running;
  }

  return {
    syncNow,
    notifyChange(): void {
      pendingChanges += 1;
      clear();
      timer = setTimeout(() => void syncNow(), debounceMs);
    },
    get pendingChanges(): number {
      return pendingChanges;
    },
    get isRunning(): boolean {
      return running !== null;
    },
    dispose(): void {
      clear();
    },
  };
}

export type SyncScheduler = ReturnType<typeof createSyncScheduler>;

/**
 * Xin trình duyệt đồng bộ nền (Chrome Android hỗ trợ): khi có mạng lại, Service Worker
 * chạy `syncOnce` kể cả khi app đã đóng. Trả về false nếu không hỗ trợ.
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as unknown as { sync?: { register(tag: string): Promise<void> } }).sync;
    if (!sync) return false;
    await sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}
