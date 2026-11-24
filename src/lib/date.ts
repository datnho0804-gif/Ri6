import type { ISODate, ISOTime } from '../types/models';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseISODateParts(iso: ISODate): { year: number; month: number; day: number } {
  const match = ISO_DATE_RE.exec(iso);
  if (!match) {
    throw new Error(`Ngày không đúng định dạng YYYY-MM-DD: "${iso}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Ngày không tồn tại trên lịch: "${iso}"`);
  }
  return { year, month, day };
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in Asia/Ho_Chi_Minh timezone.
 */
export function todayVN(now: Date = new Date()): ISODate {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns current UTC timestamp in ISO 8601 format.
 */
export function nowUTC(now: Date = new Date()): ISOTime {
  return now.toISOString();
}

/**
 * Adds a whole number of calendar days to a YYYY-MM-DD date using pure calendar arithmetic
 * (avoids raw millisecond/DST timezone drift).
 */
export function addDays(isoDate: ISODate, days: number): ISODate {
  if (!Number.isInteger(days)) {
    throw new Error(`Số ngày cộng phải là số nguyên, nhận: ${days}`);
  }
  const { year, month, day } = parseISODateParts(isoDate);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = String(shifted.getUTCFullYear()).padStart(4, '0');
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns whole calendar day difference (toDate - fromDate).
 */
export function diffDays(fromDate: ISODate, toDate: ISODate): number {
  const a = parseISODateParts(fromDate);
  const b = parseISODateParts(toDate);
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Formats YYYY-MM-DD as dd/mm/yyyy for Vietnamese UI display.
 */
export function formatDateVN(isoDate: ISODate | null | undefined): string {
  if (!isoDate) return '—';
  const { year, month, day } = parseISODateParts(isoDate);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
