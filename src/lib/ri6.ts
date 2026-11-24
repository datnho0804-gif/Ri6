import type { ISODate } from '../types/models';
import { RI6, type DayRange } from './agronomy';
import { addDays, diffDays } from './date';

export type Ri6Input = { kind: 'mat-cua' | 'xo-nhuy'; date: ISODate };

export type MilestoneKey = 'xo-nhuy' | 'tuoi-nhap' | 'chan-dot' | 'kali' | 'len-com' | 'giam-dam' | 'thu-hoach';

/**
 * - `range`: diễn ra trong khoảng [start, end] (sớm nhất → muộn nhất).
 * - `until`: kéo dài từ xổ nhụy đến một mốc kết thúc trong khoảng [earliestEnd, latestEnd].
 * - `from`: bắt đầu từ một ngày (sớm nhất → muộn nhất nếu chưa chắc ngày xổ nhụy).
 */
export interface Milestone {
  key: MilestoneKey;
  label: string;
  kind: 'range' | 'until' | 'from';
  earliest: ISODate;
  latest: ISODate;
  /** Khoảng ngày tính từ xổ nhụy (để vẽ Ri6Progress). */
  days: DayRange;
  note: string;
}

const DEFS: ReadonlyArray<{ key: Exclude<MilestoneKey, 'xo-nhuy'>; label: string; kind: Milestone['kind']; days: DayRange; note: string }> = [
  { key: 'tuoi-nhap', label: 'Tưới nhấp', kind: 'until', days: RI6.dripWatering, note: '1 ngày tưới – 1 ngày nghỉ, tùy ẩm đất' },
  { key: 'chan-dot', label: 'Chặn đọt non + Canxi-Bo', kind: 'until', days: [RI6.shootControlUntil, RI6.shootControlUntil], note: 'Chặn đọt chặt trong 30 ngày đầu' },
  { key: 'kali', label: 'Chuyển NPK giàu Kali', kind: 'range', days: RI6.potassium, note: 'Ví dụ NPK 12-11-18' },
  { key: 'len-com', label: 'Lên cơm mạnh', kind: 'range', days: RI6.fleshFilling, note: 'Giữ ẩm đều, không để sốc nước' },
  { key: 'giam-dam', label: 'Giảm đạm, giữ ẩm ổn định', kind: 'from', days: [RI6.reduceNitrogenFrom, RI6.reduceNitrogenFrom], note: 'Chống sượng, cháy múi' },
  { key: 'thu-hoach', label: 'Thu hoạch', kind: 'range', days: RI6.harvest, note: 'Ri6: 90–105 ngày sau xổ nhụy' },
];

/**
 * Bảng mốc sinh lý Ri6 (SPEC §3.2, T03 AC3).
 * Nhập ngày mắt cua: xổ nhụy = +55…+57; các mốc sau lan truyền khoảng
 * (sớm = xổ nhụy sớm + cận dưới, muộn = xổ nhụy muộn + cận trên).
 */
export function ri6Milestones(input: Ri6Input): Milestone[] {
  const [fEarly, fLate] =
    input.kind === 'xo-nhuy'
      ? [input.date, input.date]
      : [addDays(input.date, RI6.budToFlower[0]), addDays(input.date, RI6.budToFlower[1])];
  const out: Milestone[] = [];
  if (input.kind === 'mat-cua') {
    out.push({ key: 'xo-nhuy', label: 'Xổ nhụy', kind: 'range', earliest: fEarly, latest: fLate, days: [0, 0], note: 'Mắt cua → xổ nhụy 55–57 ngày' });
  }
  for (const d of DEFS) {
    out.push({ key: d.key, label: d.label, kind: d.kind, earliest: addDays(fEarly, d.days[0]), latest: addDays(fLate, d.days[1]), days: d.days, note: d.note });
  }
  return out;
}

/** Ngày thứ mấy sau xổ nhụy (0 = ngày xổ nhụy); âm nếu chưa tới. */
export function ri6Day(flowerDate: ISODate, today: ISODate): number {
  return diffDays(flowerDate, today);
}

/** Khoảng thu hoạch dự kiến từ ngày xổ nhụy. */
export function harvestWindow(flowerDate: ISODate): { from: ISODate; to: ISODate } {
  return { from: addDays(flowerDate, RI6.harvest[0]), to: addDays(flowerDate, RI6.harvest[1]) };
}
