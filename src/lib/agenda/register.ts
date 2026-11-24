import { AGENDA_MIN_INTERVAL_MS, AGENDA_TAG } from './notify';

/** Trạng thái tính năng thông báo — hiện trong màn Cài đặt (T05 AC6). */
export interface NotifyCapability {
  notificationSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  periodicSyncSupported: boolean;
}

type PeriodicSyncManagerLike = { register(tag: string, opts: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> };
const periodicSyncOf = (reg: ServiceWorkerRegistration) => (reg as unknown as { periodicSync?: PeriodicSyncManagerLike }).periodicSync;

export async function notifyCapability(): Promise<NotifyCapability> {
  const notificationSupported = typeof Notification !== 'undefined';
  let periodicSyncSupported = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      periodicSyncSupported = !!periodicSyncOf(await navigator.serviceWorker.ready);
    } catch {
      periodicSyncSupported = false;
    }
  }
  return { notificationSupported, permission: notificationSupported ? Notification.permission : 'unsupported', periodicSyncSupported };
}

/**
 * Nút "Bật nhắc nhở": CHỈ gọi khi người dùng bấm (không xin quyền lúc mở app).
 * Xin quyền Notification → đăng ký periodicsync `ri6-agenda` (nếu trình duyệt hỗ trợ, cần app đã cài).
 */
export async function enableAgendaReminders(): Promise<{ permission: NotificationPermission | 'unsupported'; periodic: boolean }> {
  if (typeof Notification === 'undefined') return { permission: 'unsupported', periodic: false };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { permission, periodic: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const ps = periodicSyncOf(reg);
    if (!ps) return { permission, periodic: false };
    await ps.register(AGENDA_TAG, { minInterval: AGENDA_MIN_INTERVAL_MS });
    return { permission, periodic: true };
  } catch {
    return { permission, periodic: false };
  }
}

export async function disableAgendaReminders(): Promise<void> {
  try {
    const ps = periodicSyncOf(await navigator.serviceWorker.ready);
    await ps?.unregister(AGENDA_TAG);
  } catch {
    /* không hỗ trợ → bỏ qua */
  }
}
