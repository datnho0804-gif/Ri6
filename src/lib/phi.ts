import type { ISODate, Log } from '../types/models';
import { RI6 } from './agronomy';
import { addDays, formatDateVN } from './date';

export interface PhiWarning {
  /** Không được thu hoạch trước ngày này. */
  notBefore: ISODate;
  logId: string;
  activeIngredient?: string;
  /** Mốc thu hoạch sớm nhất (xổ nhụy + 90). */
  harvestFrom: ISODate;
}

/** Ngày hết thời gian cách ly của một lần phun (null nếu chưa rõ PHI). */
export function phiEnd(log: Pick<Log, 'date' | 'phiDays'>): ISODate | null {
  return log.phiDays === undefined ? null : addDays(log.date, log.phiDays);
}

/**
 * Cảnh báo PHI (SPEC M2, T03 AC6): nếu (ngày phun + PHI) > (xổ nhụy + 90) thì
 * "Không thu hoạch trước dd/mm/yyyy" — lấy ngày muộn nhất trong các lần phun của cây.
 * Bỏ qua log đã xóa và log chưa rõ PHI (ví dụ nhập từ app cũ — xem `sprayLogsWithoutPhi`).
 */
export function phiWarning(flowerDate: ISODate, logs: readonly Log[], targetId?: string): PhiWarning | null {
  const harvestFrom = addDays(flowerDate, RI6.harvest[0]);
  let best: PhiWarning | null = null;
  for (const l of logs) {
    if (l.deletedAt || l.type !== 'phun-thuoc' || (targetId && l.targetId !== targetId)) continue;
    const end = phiEnd(l);
    if (!end || end <= harvestFrom) continue;
    if (!best || end > best.notBefore) best = { notBefore: end, logId: l.id, activeIngredient: l.activeIngredient, harvestFrom };
  }
  return best;
}

export function phiMessage(w: PhiWarning): string {
  return `Không thu hoạch trước ${formatDateVN(w.notBefore)}${w.activeIngredient ? ` (PHI ${w.activeIngredient})` : ''}`;
}

/** Các lần phun chưa ghi PHI — UI nhắc người dùng bổ sung để cảnh báo chính xác. */
export function sprayLogsWithoutPhi(logs: readonly Log[], targetId: string): Log[] {
  return logs.filter((l) => !l.deletedAt && l.type === 'phun-thuoc' && l.targetId === targetId && l.phiDays === undefined);
}
