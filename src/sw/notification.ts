/// <reference lib="webworker" />

/**
 * Bấm thông báo → đóng thông báo, đưa tab đang mở lên trước và chuyển tới
 * `data.url` (mặc định `./#/agenda`); không có tab thì mở cửa sổ mới (SPEC M6).
 * `src/sw.ts` (Antigravity) gọi: `registerNotificationClick(self)`.
 */
export function registerNotificationClick(sw: ServiceWorkerGlobalScope): void {
  sw.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    const rel = (event.notification.data as { url?: string } | null)?.url ?? './#/agenda';
    const url = new URL(rel, sw.registration.scope).href;
    event.waitUntil(
      (async () => {
        const wins = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const inScope = wins.find((w) => w.url.startsWith(sw.registration.scope));
        if (inScope) {
          await inScope.focus();
          await inScope.navigate(url).catch(() => undefined);
          return;
        }
        await sw.clients.openWindow(url);
      })(),
    );
  });
}
