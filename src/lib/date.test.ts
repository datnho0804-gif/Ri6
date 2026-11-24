import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDateVN, todayVN } from './date';

describe('date utilities (pure calendar arithmetic)', () => {
  it('satisfies T01 AC10 Ri6 milestone date additions', () => {
    expect(addDays('2026-12-01', 55)).toBe('2027-01-25');
    expect(addDays('2027-01-25', 90)).toBe('2027-04-25');
  });

  it('handles leap years, year crossings, and negative day offsets accurately', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-11-24', 0)).toBe('2026-11-24');
  });

  it('computes calendar day differences cleanly', () => {
    expect(diffDays('2026-12-01', '2027-01-25')).toBe(55);
    expect(diffDays('2027-01-25', '2027-04-25')).toBe(90);
    expect(diffDays('2026-11-24', '2026-11-16')).toBe(-8);
  });

  it('formats YYYY-MM-DD into dd/mm/yyyy', () => {
    expect(formatDateVN('2027-01-25')).toBe('25/01/2027');
    expect(formatDateVN('2026-12-01')).toBe('01/12/2026');
    expect(formatDateVN(null)).toBe('—');
  });

  it('returns YYYY-MM-DD in Asia/Ho_Chi_Minh timezone', () => {
    // 2026-11-24 18:00 UTC is 2026-11-25 01:00 in UTC+7 (Asia/Ho_Chi_Minh)
    const utcEvening = new Date('2026-11-24T18:00:00.000Z');
    expect(todayVN(utcEvening)).toBe('2026-11-25');
  });

  it('rejects invalid calendar dates', () => {
    expect(() => addDays('2027-02-29', 1)).toThrow();
    expect(() => addDays('24/11/2026', 1)).toThrow();
  });
});
