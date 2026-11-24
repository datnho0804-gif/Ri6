import { describe, expect, it, vi } from 'vitest';
import type { NotifySettings } from '../types/models';
import { emptySyncState } from '../lib/merge';
import { makeTree } from '../lib/testFixtures';
import { registerAgendaNotifications } from './agenda';
import { registerNotificationClick } from './notification';

/** Service Worker giả lập tối thiểu: ghi lại listener, showNotification, clients. */
function fakeSw() {
  const listeners = new Map<string, (e: unknown) => void>();
  const shown: Array<{ title: string; opts: NotificationOptions }> = [];
  const posted: unknown[] = [];
  const opened: string[] = [];
  const sw = {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    registration: { scope: 'https://x.github.io/Ri6/', showNotification: vi.fn(async (title: string, opts: NotificationOptions) => { shown.push({ title, opts }); }) },
    clients: { matchAll: vi.fn(async () => [{ url: 'https://x.github.io/Ri6/', postMessage: (m: unknown) => posted.push(m), focus: vi.fn(async () => {}), navigate: vi.fn(async (u: string) => { opened.push(`nav:${u}`); }) }]), openWindow: vi.fn(async (u: string) => { opened.push(u); }) },
    fetch: vi.fn(),
  };
  const fire = async (type: string, extra: Record<string, unknown>) => {
    let p: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ ...extra, waitUntil: (x: Promise<unknown>) => { p = x; } });
    return p;
  };
  return { sw: sw as unknown as ServiceWorkerGlobalScope, shown, posted, opened, fire, listeners };
}

describe('src/sw/agenda — periodicsync ri6-agenda (T05 AC5)', () => {
  it('gửi đúng 1 thông báo/ngày, lưu lastNotifiedAt + lastKeys; tag khác thì bỏ qua', async () => {
    const f = fakeSw();
    let notify: NotifySettings = { enabled: true, lastKeys: [] };
    registerAgendaNotifications(f.sw, {
      loadState: async () => ({ ...emptySyncState(), trees: [makeTree({ id: 'SR02' })] }),
      loadNotify: async () => notify,
      saveNotify: async (n) => { notify = n; },
      now: () => '2026-11-25T00:30:00.000Z', // 07:30 giờ VN
      today: () => '2026-11-25',
    });
    await f.fire('periodicsync', { tag: 'khac' });
    expect(f.shown).toHaveLength(0);
    await f.fire('periodicsync', { tag: 'ri6-agenda' });
    expect(f.shown).toHaveLength(1);
    expect(f.shown[0].title).toMatch(/Hôm nay có \d+ việc/);
    expect(notify.lastKeys).toContain('photo:SR02');
    await f.fire('periodicsync', { tag: 'ri6-agenda' });
    expect(f.shown).toHaveLength(1); // cùng ngày → không báo lại
  });
  it('"Gửi thông báo thử" (message) báo ngay kể cả khi chưa bật', async () => {
    const f = fakeSw();
    registerAgendaNotifications(f.sw, { loadState: async () => emptySyncState(), loadNotify: async () => null, saveNotify: async () => {}, now: () => '2026-11-25T14:30:00.000Z', today: () => '2026-11-25' });
    await f.fire('message', { data: { type: 'ri6-test-notification' } });
    expect(f.shown).toHaveLength(1);
  });
});

describe('src/sw/notification — bấm thông báo', () => {
  it('đưa tab đang mở lên và chuyển tới #/agenda', async () => {
    const f = fakeSw();
    registerNotificationClick(f.sw);
    const close = vi.fn();
    await f.fire('notificationclick', { notification: { close, data: { url: './#/agenda' } } });
    expect(close).toHaveBeenCalled();
    expect(f.opened).toEqual(['nav:https://x.github.io/Ri6/#/agenda']);
  });
});
