import { describe, expect, it, vi } from 'vitest';
import { emptySyncState } from '../lib/merge';
import { registerBackgroundSync } from './sync';

/** Service Worker giả lập tối thiểu cho sự kiện `sync`. */
function fakeSw() {
  const listeners = new Map<string, (e: unknown) => void>();
  const posted: unknown[] = [];
  const sw = {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    clients: { matchAll: vi.fn(async () => [{ postMessage: (m: unknown) => posted.push(m) }]) },
    fetch: vi.fn(),
  };
  const fire = async (type: string, extra: Record<string, unknown>) => {
    let p: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ ...extra, waitUntil: (x: Promise<unknown>) => { p = x; } });
    return p;
  };
  return { sw: sw as unknown as ServiceWorkerGlobalScope, posted, fire };
}

describe('src/sw/sync — Background Sync ri6-sync (T04 AC8)', () => {
  it('chưa cấu hình / tắt tự động → không làm gì; tag khác bỏ qua', async () => {
    const f = fakeSw();
    const loadState = vi.fn(async () => emptySyncState());
    registerBackgroundSync(f.sw, { store: { loadState, saveState: async () => {}, pendingPhotoUploads: async () => [] }, loadConfig: async () => null });
    await f.fire('sync', { tag: 'ri6-sync' });
    await f.fire('sync', { tag: 'khac' });
    expect(loadState).not.toHaveBeenCalled();
  });
  it('lỗi mạng → báo kết quả cho các tab và ném lỗi để trình duyệt thử lại (trừ lần cuối)', async () => {
    const f = fakeSw();
    (f.sw as unknown as { fetch: ReturnType<typeof vi.fn> }).fetch.mockRejectedValue(new TypeError('offline'));
    const deps = {
      store: { loadState: async () => emptySyncState(), saveState: async () => {}, pendingPhotoUploads: async () => [] },
      loadConfig: async () => ({ token: 't', repo: 'a/b', branch: 'main', deviceId: 'd', deviceName: 'Máy', autoSync: true }),
    };
    registerBackgroundSync(f.sw, deps);
    await expect(f.fire('sync', { tag: 'ri6-sync' })).rejects.toThrow(/network/);
    expect(f.posted[0]).toMatchObject({ type: 'ri6-sync-result', result: { status: 'error', kind: 'network' } });
    await expect(f.fire('sync', { tag: 'ri6-sync', lastChance: true })).resolves.toBeUndefined();
  });
});
