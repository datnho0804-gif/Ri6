import type { ISODate, Photo } from '../types/models';
import { PHOTO_STATUS_DAYS } from './agronomy';
import { diffDays } from './date';

export type PhotoStatus = 'ok' | 'due-soon' | 'overdue';

/**
 * Trạng thái ảnh tuần (SPEC M1).
 * d = số ngày từ ảnh tuần gần nhất tới hôm nay: 0–5 ok · 6–7 due-soon · ≥ 8 hoặc chưa có → overdue.
 */
export function photoStatus(lastWeekly: ISODate | null | undefined, today: ISODate): PhotoStatus {
  if (!lastWeekly) return 'overdue';
  const d = diffDays(lastWeekly, today);
  if (d <= PHOTO_STATUS_DAYS.okMax) return 'ok';
  if (d <= PHOTO_STATUS_DAYS.dueSoonMax) return 'due-soon';
  return 'overdue';
}

/** Số ngày kể từ ảnh tuần gần nhất (null nếu chưa có). */
export function daysSinceWeekly(lastWeekly: ISODate | null | undefined, today: ISODate): number | null {
  return lastWeekly ? diffDays(lastWeekly, today) : null;
}

/** Ngày ảnh tuần (`kind = 'weekly'`, chưa xóa) gần nhất của từng đối tượng. */
export function lastWeeklyByTarget(photos: readonly Photo[]): Map<string, ISODate> {
  const map = new Map<string, ISODate>();
  for (const p of photos) {
    if (p.deletedAt || p.kind !== 'weekly') continue;
    const prev = map.get(p.targetId);
    if (!prev || p.takenAt > prev) map.set(p.targetId, p.takenAt);
  }
  return map;
}
