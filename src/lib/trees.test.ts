import { describe, expect, it } from 'vitest';
import { computeImageSizes, fitWithin } from './imageSizes';
import { lastWeeklyByTarget, photoStatus } from './photoStatus';
import { effectiveSeason, seasonOf } from './season';
import { makeLot, makePhoto, makeTree, seqIds, T0 } from './testFixtures';
import { normalizeVi } from './text';
import { duplicateCodes, nextTreeCode } from './treeCodes';
import { filterTrees } from './treeFilters';
import { splitFromLotA, totalTreeCount } from './lotSplit';

describe('photoStatus (T02 AC2)', () => {
  const today = '2026-11-24';
  it.each([
    [undefined, 'overdue'],
    ['2026-11-24', 'ok'],
    ['2026-11-19', 'ok'],
    ['2026-11-18', 'due-soon'],
    ['2026-11-17', 'due-soon'],
    ['2026-11-16', 'overdue'],
  ] as const)('ảnh tuần %s → %s', (last, want) => {
    expect(photoStatus(last, today)).toBe(want);
  });

  it('lastWeeklyByTarget chỉ lấy ảnh tuần chưa xóa, ngày mới nhất', () => {
    const m = lastWeeklyByTarget([
      makePhoto({ id: 'p1', targetId: 'SR01', takenAt: '2026-11-10' }),
      makePhoto({ id: 'p2', targetId: 'SR01', takenAt: '2026-11-20' }),
      makePhoto({ id: 'p3', targetId: 'SR01', takenAt: '2026-11-22', kind: 'disease' }),
      makePhoto({ id: 'p4', targetId: 'SR01', takenAt: '2026-11-23', deletedAt: T0 }),
    ]);
    expect(m.get('SR01')).toBe('2026-11-20');
  });
});

describe('filterTrees (T02 AC3)', () => {
  const trees = [
    makeTree({ id: 'SR01', label: 'SR01 - Góc cổng' }),
    makeTree({ id: 'SR02', needsPruning: true, location: 'Gần giếng' }),
    makeTree({ id: 'SR03', diseaseWatch: true }),
    makeTree({ id: 'SR04', health: 'benh' }),
    makeTree({ id: 'SR05', deletedAt: T0 }),
  ];
  const ctx = { today: '2026-11-24', lastWeekly: new Map([['SR01', '2026-11-23'], ['SR02', '2026-11-18']]) };
  const ids = (f: Parameters<typeof filterTrees>[1]) => filterTrees(trees, f, ctx).map((t) => t.id);

  it('Tất cả: bỏ cây đã xóa', () => expect(ids({ filter: 'all' })).toEqual(['SR01', 'SR02', 'SR03', 'SR04']));
  it('Cần chụp tuần này = vàng + đỏ', () => expect(ids({ filter: 'need-photo' })).toEqual(['SR02', 'SR03', 'SR04']));
  it('Cần cắt tỉa', () => expect(ids({ filter: 'need-pruning' })).toEqual(['SR02']));
  it('Theo dõi sâu bệnh = diseaseWatch hoặc health=benh', () => expect(ids({ filter: 'disease-watch' })).toEqual(['SR03', 'SR04']));
  it('Tìm không dấu, không phân biệt hoa thường', () => {
    expect(ids({ filter: 'all', query: 'goc cong' })).toEqual(['SR01']);
    expect(ids({ filter: 'all', query: 'GIẾNG' })).toEqual(['SR02']);
  });
  it('normalizeVi', () => expect(normalizeVi('  Đất  ĐỎ bazan ')).toBe('dat do bazan'));
});

describe('computeImageSizes (T02 AC4, DESIGN §5)', () => {
  it('4000×3000 → 1600×1200 + thumb 480×360', () => {
    expect(computeImageSizes(4000, 3000)).toEqual({ full: { width: 1600, height: 1200 }, thumb: { width: 480, height: 360 } });
  });
  it('3000×4000 → 1200×1600 + thumb 360×480', () => {
    expect(computeImageSizes(3000, 4000)).toEqual({ full: { width: 1200, height: 1600 }, thumb: { width: 360, height: 480 } });
  });
  it('không phóng to ảnh nhỏ', () => expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 }));
  it('từ chối kích thước 0', () => expect(() => fitWithin(0, 10, 100)).toThrow());
});

describe('nextTreeCode / duplicateCodes (T02 AC3 [1.1])', () => {
  const sr = (n: number) => makeTree({ id: `SR${String(n).padStart(2, '0')}` });
  const fifteen = Array.from({ length: 15 }, (_, i) => sr(i + 1));
  it('SR01–SR15 → SR16', () => expect(nextTreeCode(fifteen)).toBe('SR16'));
  it('SR16 đã xóa → SR17 (không cấp lại)', () => expect(nextTreeCode([...fifteen, makeTree({ id: 'u1', code: 'SR16', deletedAt: T0 })])).toBe('SR17'));
  it('bỏ qua mã không theo mẫu', () =>
    expect(nextTreeCode([sr(1), sr(9), makeTree({ id: 'x', code: 'Góc cổng' })])).toBe('SR10'));
  it('trên 99 vẫn đúng', () => expect(nextTreeCode([makeTree({ id: 'a', code: 'SR99' })])).toBe('SR100'));
  it('duplicateCodes: 2 máy cùng tạo SR16 → báo trùng; cây đã xóa không tính', () => {
    const d = duplicateCodes([
      ...fifteen,
      makeTree({ id: 'uuid-a', code: 'SR16' }),
      makeTree({ id: 'uuid-b', code: 'sr16' }),
      makeTree({ id: 'uuid-c', code: 'SR17', deletedAt: T0 }),
      makeTree({ id: 'uuid-d', code: 'SR17' }),
    ]);
    expect([...d.entries()]).toEqual([['SR16', ['uuid-a', 'uuid-b']]]);
  });
});

describe('splitFromLotA (T02 AC3 [1.1])', () => {
  const fifteen = Array.from({ length: 15 }, (_, i) => makeTree({ id: `SR${String(i + 1).padStart(2, '0')}` }));
  const ctx = { deviceId: 'dev', now: '2026-11-25T01:00:00.000Z', today: '2026-11-25', newId: seqIds('u') };
  it('tách 3 cây từ 50 → còn 47, 3 cây lot A, 1 log lưu vết', () => {
    const r = splitFromLotA(makeLot(), fifteen, 3, ctx);
    if (!r.ok) throw new Error(r.error);
    expect(r.lot.treeCount).toBe(47);
    expect(r.newTrees.map((t) => [t.code, t.lot])).toEqual([['SR16', 'A'], ['SR17', 'A'], ['SR18', 'A']]);
    expect(r.newTrees.every((t) => t.id.startsWith('u-'))).toBe(true);
    expect(r.log).toMatchObject({ targetId: 'LOT_A', type: 'khac', date: '2026-11-25' });
    expect(r.log.note).toContain('SR16, SR17, SR18');
    expect(totalTreeCount([...fifteen, ...r.newTrees], r.lot)).toBe(65);
  });
  it('tách 51 cây → từ chối', () => expect(splitFromLotA(makeLot(), fifteen, 51, ctx).ok).toBe(false));
  it('tách 0 hoặc số lẻ → từ chối', () => {
    expect(splitFromLotA(makeLot(), fifteen, 0, ctx).ok).toBe(false);
    expect(splitFromLotA(makeLot(), fifteen, 1.5, ctx).ok).toBe(false);
  });
});

describe('season', () => {
  it.each([
    ['2026-11-01', 'kho'], ['2027-04-30', 'kho'], ['2026-05-01', 'mua'], ['2026-10-31', 'mua'],
  ] as const)('%s → %s', (d, s) => expect(seasonOf(d)).toBe(s));
  it('override thắng', () => expect(effectiveSeason('2026-11-24', 'mua')).toBe('mua'));
});
