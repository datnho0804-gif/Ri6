import { describe, expect, it } from 'vitest';
import {
  formatBytesVN,
  formatDateFieldLabelVN,
  formatHeaderDateVN,
  formatNumberVN,
  formatRelativeDateVN,
  formatShortDateVN,
} from './format';

describe('vi-VN formatting helpers (DESIGN §7)', () => {
  it('formats header dates with Vietnamese weekday and dd/mm', () => {
    expect(formatHeaderDateVN('2026-11-24')).toBe('Thứ Ba, 24/11');
    expect(formatHeaderDateVN('2026-11-29')).toBe('Chủ Nhật, 29/11');
  });

  it('formats short and relative dates', () => {
    expect(formatShortDateVN('2026-11-24')).toBe('24/11');
    expect(formatRelativeDateVN('2026-11-24', '2026-11-24')).toBe('Hôm nay');
    expect(formatRelativeDateVN('2026-11-23', '2026-11-24')).toBe('Hôm qua');
    expect(formatRelativeDateVN('2026-11-21', '2026-11-24')).toBe('3 ngày');
  });

  it('formats DateField labels concisely', () => {
    expect(formatDateFieldLabelVN('2026-11-24', '2026-11-24')).toBe('Hôm nay, 24/11');
    expect(formatDateFieldLabelVN('2026-11-23', '2026-11-24')).toBe('Hôm qua, 23/11');
    expect(formatDateFieldLabelVN('2026-10-15', '2026-11-24')).toBe('15/10/2026');
  });

  it('formats numbers and storage bytes with Vietnamese decimal comma', () => {
    expect(formatNumberVN(5.1)).toBe('5,1');
    expect(formatNumberVN(1.5)).toBe('1,5');
    expect(formatBytesVN(null)).toBe('Không đo được');
    expect(formatBytesVN(1_153_434)).toBe('1,1 MB');
    expect(formatBytesVN(10 * 1024 * 1024 * 1024)).toBe('10 GB');
  });
});
