import type { ISODate } from '../types/models';
import { diffDays, todayVN } from './date';

const vnDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const vnInteger = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const WEEKDAYS_VN = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

function parseParts(isoDate: ISODate): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/**
 * Formats ISO date as header string: "Thứ Ba, 24/11" (DESIGN §7).
 */
export function formatHeaderDateVN(isoDate: ISODate): string {
  const parts = parseParts(isoDate);
  if (!parts) return isoDate;
  const weekdayIdx = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  return `${WEEKDAYS_VN[weekdayIdx]}, ${dd}/${mm}`;
}

/**
 * Formats ISO date as compact day/month: "24/11" (DESIGN §7).
 */
export function formatShortDateVN(isoDate: ISODate): string {
  const parts = parseParts(isoDate);
  if (!parts) return isoDate;
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}`;
}

/**
 * Formats ISO date relative to todayVN: "Hôm nay", "Hôm qua", "3 ngày", or full date (DESIGN §7).
 */
export function formatRelativeDateVN(isoDate: ISODate, today: ISODate = todayVN()): string {
  const delta = diffDays(isoDate, today);
  if (delta === 0) return 'Hôm nay';
  if (delta === 1) return 'Hôm qua';
  if (delta > 1 && delta <= 30) return `${delta} ngày`;
  return formatShortDateVN(isoDate);
}

/**
 * Formats date chip label: "Hôm nay, 24/11" / "Hôm qua, 23/11" / "24/11/2026".
 */
export function formatDateFieldLabelVN(isoDate: ISODate, today: ISODate = todayVN()): string {
  const parts = parseParts(isoDate);
  if (!parts) return isoDate;
  const delta = diffDays(isoDate, today);
  const short = formatShortDateVN(isoDate);
  if (delta === 0) return `Hôm nay, ${short}`;
  if (delta === 1) return `Hôm qua, ${short}`;
  return `${short}/${parts.year}`;
}

/**
 * Formats numbers using Vietnamese locale comma decimal (e.g. 5,1 or 1,5).
 */
export function formatNumberVN(value: number, maxFractionDigits = 1): string {
  if (maxFractionDigits === 0) return vnInteger.format(value);
  if (maxFractionDigits === 1) return vnDecimal.format(value);
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: maxFractionDigits }).format(value);
}

/**
 * Formats storage bytes in Vietnamese locale using B / KB / MB / GB.
 */
export function formatBytesVN(bytes: number | null): string {
  if (bytes === null) return 'Không đo được';
  if (bytes < 1024) return `${vnDecimal.format(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${vnDecimal.format(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${vnDecimal.format(mb)} MB`;
  const gb = mb / 1024;
  return `${vnDecimal.format(gb)} GB`;
}
