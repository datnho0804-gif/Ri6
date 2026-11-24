/// <reference lib="webworker" />
import type { ISODate, ISOTime, NotifySettings } from '../types/models';
import { buildAgenda } from '../lib/agenda/agenda';
import { AGENDA_TAG, buildAgendaNotification, shouldNotify } from '../lib/agenda/notify';
import type { SyncState } from '../lib/merge';

interface PeriodicSyncEventLike extends ExtendableEvent {
  readonly tag: string;
}

export interface AgendaSwDeps {
  /** Đọc dữ liệu từ Dexie (Antigravity hiện thực). */
  loadState: () => Promise<SyncState>;
  loadNotify: () => Promise<NotifySettings | null>;
  saveNotify: (n: NotifySettings) => Promise<void>;
  /** Mặc định: giờ hệ thống; ngày theo giờ VN. */
  now?: () => ISOTime;
  today?: () => ISODate;
}

const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Nhắc việc nền (SPEC M6, T05 AC5): khi trình duyệt chạy periodicsync `ri6-agenda`,
 * tính `buildAgenda` từ IndexedDB và gửi TỐI ĐA 1 thông báo tổng hợp mỗi ngày (theo `shouldNotify`).
 * `src/sw.ts` (Antigravity) gọi: `registerAgendaNotifications(self, deps)`.
 * Trả về hàm `check()` để test / gọi thủ công ("Gửi thông báo thử" dùng `force`).
 */
export function registerAgendaNotifications(sw: ServiceWorkerGlobalScope, deps: AgendaSwDeps) {
  const now = deps.now ?? (() => new Date().toISOString());
  const today = deps.today ?? vnToday;

  async function check(force = false): Promise<boolean> {
    const settings = await deps.loadNotify();
    if (!force && !settings?.enabled) return false;
    const items = buildAgenda(await deps.loadState(), today());
    const keys = items.map((i) => i.key);
    const t = now();
    const decision = shouldNotify({ now: t, lastNotifiedAt: settings?.lastNotifiedAt, lastKeys: settings?.lastKeys ?? [], keys });
    if (!force && !decision.notify) return false;
    const n = buildAgendaNotification(items);
    await sw.registration.showNotification(n.title, {
      body: n.body || 'Không có việc nào hôm nay.',
      tag: n.tag,
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-96.png',
      data: { url: n.url },
    });
    await deps.saveNotify({ enabled: settings?.enabled ?? false, lastNotifiedAt: t, lastKeys: keys });
    return true;
  }

  sw.addEventListener('periodicsync', (event: Event) => {
    const e = event as PeriodicSyncEventLike;
    if (e.tag !== AGENDA_TAG) return;
    e.waitUntil(check().then(() => undefined));
  });
  // Trang gửi { type: 'ri6-test-notification' } cho nút "Gửi thông báo thử".
  sw.addEventListener('message', (event: ExtendableMessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === 'ri6-test-notification') event.waitUntil(check(true).then(() => undefined));
  });
  return { check };
}
