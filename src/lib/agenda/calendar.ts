import type { ISODate } from '../../types/models';
import { addDays } from '../date';
import type { AgendaItem } from './agenda';

const compact = (d: ISODate) => d.replaceAll('-', '');
const enc = (s: string) => encodeURIComponent(s);

/**
 * Link "Thêm vào Google Calendar" (SPEC M6, T05 AC4).
 * Sự kiện cả ngày: `dates=YYYYMMDD/YYYYMMDD` với ngày kết thúc **cộng 1** (exclusive).
 * `weekly: true` → thêm `recur=RRULE:FREQ=WEEKLY` (nhắc chụp ảnh tuần).
 */
export function calendarUrl(e: { title: string; start: ISODate; end?: ISODate; details?: string; weekly?: boolean }): string {
  const end = addDays(e.end ?? e.start, 1);
  const parts = [
    'action=TEMPLATE',
    `text=${enc(e.title)}`,
    `dates=${compact(e.start)}/${compact(end)}`,
    ...(e.details ? [`details=${enc(e.details)}`] : []),
    ...(e.weekly ? [`recur=${enc('RRULE:FREQ=WEEKLY')}`] : []),
    `ctz=${enc('Asia/Ho_Chi_Minh')}`,
  ];
  return `https://calendar.google.com/calendar/render?${parts.join('&')}`;
}

/** Link lịch cho một việc cần làm; mốc thu hoạch dùng cả khoảng [from, to]. */
export function agendaItemCalendarUrl(item: AgendaItem, range?: { from: ISODate; to: ISODate }): string {
  return calendarUrl({
    title: `Vườn Ri6 · ${item.title}`,
    start: range?.from ?? item.dueDate,
    end: range?.to,
    details: `${item.reason}\n(Tạo từ Sổ Tay Vườn Ri6)`,
  });
}

/** Sự kiện lặp hằng tuần "Chụp ảnh tuần Lô B". */
export function weeklyPhotoReminderUrl(start: ISODate): string {
  return calendarUrl({ title: 'Vườn Ri6 · Chụp ảnh tuần các cây Lô B', start, details: 'Mở Sổ Tay Vườn Ri6 → Tổng quan → Ảnh tuần.', weekly: true });
}
