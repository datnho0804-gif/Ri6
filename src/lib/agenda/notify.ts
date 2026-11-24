import type { ISOTime } from '../../types/models';
import type { AgendaItem } from './agenda';

/** Tag Periodic Background Sync cho nhắc việc (SPEC M6). */
export const AGENDA_TAG = 'ri6-agenda';
/** `minInterval` khi đăng ký periodicsync. */
export const AGENDA_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
/** Giờ yên lặng theo giờ Việt Nam: [21:00, 06:00). */
export const QUIET_HOURS = { from: 21, to: 6 } as const;

/** Việt Nam dùng UTC+7 cố định (không có giờ mùa hè). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDate = (t: ISOTime) => new Date(Date.parse(t) + VN_OFFSET_MS).toISOString().slice(0, 10);
const vnHour = (t: ISOTime) => new Date(Date.parse(t) + VN_OFFSET_MS).getUTCHours();

export interface NotifyDecision {
  notify: boolean;
  reason: 'quiet-hours' | 'already-today' | 'nothing-new' | 'empty' | 'ok';
  newKeys: string[];
}

/**
 * Quyết định có gửi thông báo tổng hợp không (SPEC M6, T05 AC5):
 * tối đa 1 lần/ngày (theo ngày VN), không báo 21:00–06:00, chỉ báo khi có việc MỚI so với lần trước.
 */
export function shouldNotify(input: { now: ISOTime; lastNotifiedAt?: ISOTime; lastKeys: readonly string[]; keys: readonly string[] }): NotifyDecision {
  const newKeys = input.keys.filter((k) => !input.lastKeys.includes(k));
  if (input.keys.length === 0) return { notify: false, reason: 'empty', newKeys };
  const h = vnHour(input.now);
  if (h >= QUIET_HOURS.from || h < QUIET_HOURS.to) return { notify: false, reason: 'quiet-hours', newKeys };
  if (input.lastNotifiedAt && vnDate(input.lastNotifiedAt) === vnDate(input.now)) return { notify: false, reason: 'already-today', newKeys };
  if (newKeys.length === 0) return { notify: false, reason: 'nothing-new', newKeys };
  return { notify: true, reason: 'ok', newKeys };
}

/** Nội dung thông báo tổng hợp. Bấm vào → mở màn Việc cần làm. */
export function buildAgendaNotification(items: readonly AgendaItem[]): { title: string; body: string; tag: string; url: string } {
  const top = items.slice(0, 3).map((i) => `• ${i.title}`);
  return {
    title: `Vườn Ri6 · Hôm nay có ${items.length} việc`,
    body: top.join('\n') + (items.length > 3 ? `\n… và ${items.length - 3} việc khác` : ''),
    tag: AGENDA_TAG,
    url: './#/agenda',
  };
}
