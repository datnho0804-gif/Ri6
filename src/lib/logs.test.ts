import { describe, expect, it } from 'vitest';
import { batchSize, createBatchLogs, tombstoneBatch, withoutViolations } from './batchLogs';
import { limeGapViolations, validateLog } from './logRules';
import { buildTreeCopyPrompt, recentLogs } from './copyPrompt';
import { makeLog, makeTree, seqIds } from './testFixtures';

describe('validateLog (T02 AC5)', () => {
  it('Phun thuốc bắt buộc hoạt chất + PHI', () => {
    expect(validateLog({ type: 'phun-thuoc', date: '2026-11-24' })).toEqual({
      activeIngredient: expect.any(String),
      phiDays: expect.any(String),
    });
    expect(validateLog({ type: 'phun-thuoc', date: '2026-11-24', activeIngredient: 'Emamectin benzoate', phiDays: 21 })).toEqual({});
  });
  it('Bón phân bắt buộc loại phân', () => {
    expect(validateLog({ type: 'bon-phan', date: '2026-11-24' }).fertilizerKind).toBeDefined();
    expect(validateLog({ type: 'bon-phan', date: '2026-11-24', fertilizerKind: 'npk' })).toEqual({});
  });
  it.each([[2.5, false], [9.5, false], [3, true], [9, true], [5.1, true]])('Đo pH %s hợp lệ=%s', (ph, ok) => {
    expect(Object.keys(validateLog({ type: 'do-ph', date: '2026-11-24', soilPh: ph })).length === 0).toBe(ok);
  });
});

describe('limeGapViolations (SPEC §3.3, M6)', () => {
  const lime = makeLog({ id: 'lime1', targetId: 'SR02', date: '2026-11-20', type: 'bon-phan', fertilizerKind: 'voi-dolomite' });
  it('Hữu cơ trước +15 ngày → vi phạm, notBefore 05/12', () => {
    expect(limeGapViolations([lime], ['SR02'], '2026-11-28', 'huu-co-trichoderma')).toEqual([
      { targetId: 'SR02', limeLogId: 'lime1', limeDate: '2026-11-20', notBefore: '2026-12-05', gapDays: 15 },
    ]);
  });
  it('Urê/lân trước +10 ngày → vi phạm; đúng ngày 30/11 → không', () => {
    expect(limeGapViolations([lime], ['SR02'], '2026-11-29', 'dam-ure')[0]?.notBefore).toBe('2026-11-30');
    expect(limeGapViolations([lime], ['SR02'], '2026-11-30', 'lan')).toEqual([]);
  });
  it('NPK, cây khác, vôi đã xóa, vôi sau ngày bón → không vi phạm', () => {
    expect(limeGapViolations([lime], ['SR02'], '2026-11-28', 'npk')).toEqual([]);
    expect(limeGapViolations([lime], ['SR03'], '2026-11-28', 'huu-co-trichoderma')).toEqual([]);
    expect(limeGapViolations([{ ...lime, deletedAt: 'x' }], ['SR02'], '2026-11-28', 'huu-co-trichoderma')).toEqual([]);
    expect(limeGapViolations([lime], ['SR02'], '2026-11-19', 'huu-co-trichoderma')).toEqual([]);
  });
});

describe('createBatchLogs (T02 AC5 [1.1])', () => {
  const lotB = Array.from({ length: 15 }, (_, i) => `SR${String(i + 1).padStart(2, '0')}`);
  const ctx = (existingLogs = [] as ReturnType<typeof makeLog>[]) => ({ existingLogs, deviceId: 'dev', now: '2026-11-24T10:00:00.000Z', newId: seqIds('x') });

  it('(a) 15 cây Lô B + Phun thuốc → 15 log cùng batchId, cùng hoạt chất & PHI', () => {
    const r = createBatchLogs({ treeIds: lotB, type: 'phun-thuoc', date: '2026-11-20', activeIngredient: ' Emamectin benzoate ', phiDays: 21 }, ctx());
    if (!r.ok) throw new Error('fail');
    expect(r.logs).toHaveLength(15);
    expect(new Set(r.logs.map((l) => l.batchId))).toEqual(new Set([r.batchId]));
    expect(r.logs.every((l) => l.activeIngredient === 'Emamectin benzoate' && l.phiDays === 21)).toBe(true);
    expect(batchSize(r.logs, r.batchId)).toBe(15);
  });
  it('(b) thiếu PHI → lỗi, không tạo log', () => {
    const r = createBatchLogs({ treeIds: lotB, type: 'phun-thuoc', date: '2026-11-20', activeIngredient: 'Emamectin benzoate' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.phiDays).toBeDefined();
  });
  it('(c) SR02 có vôi 20/11, bón Hữu cơ 28/11 cho SR01–SR03 → chỉ SR02 vi phạm', () => {
    const lime = makeLog({ id: 'lime', targetId: 'SR02', date: '2026-11-20', type: 'bon-phan', fertilizerKind: 'voi-dolomite' });
    const r = createBatchLogs({ treeIds: ['SR01', 'SR02', 'SR03'], type: 'bon-phan', date: '2026-11-28', fertilizerKind: 'huu-co-trichoderma' }, ctx([lime]));
    if (!r.ok) throw new Error('fail');
    expect(r.limeViolations.map((v) => v.targetId)).toEqual(['SR02']);
    expect(withoutViolations(r).map((l) => l.targetId)).toEqual(['SR01', 'SR03']);
  });
  it('(d) "Kèm Lô A" → thêm 1 log LOT_A', () => {
    const r = createBatchLogs({ treeIds: ['SR01'], includeLotA: true, type: 'tuoi', date: '2026-11-24' }, ctx());
    if (!r.ok) throw new Error('fail');
    expect(r.logs.map((l) => l.targetId)).toEqual(['SR01', 'LOT_A']);
  });
  it('không chọn cây → lỗi', () => expect(createBatchLogs({ treeIds: [], type: 'tuoi', date: '2026-11-24' }, ctx()).ok).toBe(false));
  it('Xóa cả đợt → tombstone đúng các log cùng batchId', () => {
    const r = createBatchLogs({ treeIds: ['SR01', 'SR02'], type: 'tuoi', date: '2026-11-24' }, ctx());
    if (!r.ok) throw new Error('fail');
    const other = makeLog({ id: 'o', targetId: 'SR01', date: '2026-11-24' });
    const t = tombstoneBatch([...r.logs, other], r.batchId, 'dev2', '2026-11-24T11:00:00.000Z');
    expect(t.map((l) => [l.targetId, l.deletedAt, l.updatedBy])).toEqual([
      ['SR01', '2026-11-24T11:00:00.000Z', 'dev2'],
      ['SR02', '2026-11-24T11:00:00.000Z', 'dev2'],
    ]);
  });
});

describe('Copy Prompt (T02 AC6)', () => {
  const tree = makeTree({ id: 'SR03', label: 'SR03 · Góc giếng', ageYears: 4, stage: 'nuoi-trai', diseaseWatch: true, flowerDate: '2026-09-26', fruitCount: 42, fruitLimit: 40 });
  const logs = Array.from({ length: 12 }, (_, i) =>
    makeLog({ id: `l${i}`, targetId: 'SR03', date: `2026-11-${String(i + 1).padStart(2, '0')}`, type: 'tuoi', note: `n${i}` }),
  );
  logs.push(makeLog({ id: 'sp', targetId: 'SR03', date: '2026-11-20', type: 'phun-thuoc', activeIngredient: 'Emamectin benzoate', phiDays: 21 }));
  logs.push(makeLog({ id: 'other', targetId: 'SR04', date: '2026-11-23', type: 'tuoi' }));
  const p = buildTreeCopyPrompt({ tree, logs, lastWeekly: '2026-11-23', season: 'kho', today: '2026-11-24' });

  it('có bối cảnh vườn, mùa, thông tin cây', () => {
    for (const s of ['Lộc Tấn', 'đất đỏ bazan', 'béc tưới gốc', 'mùa khô', 'SR03 · Góc giếng', '4 năm tuổi', 'Nuôi trái', 'đang theo dõi sâu bệnh', 'ngày 59', '42', 'mức tối đa tôi đặt: 40', '23/11/2026'])
      expect(p).toContain(s);
  });
  it('đúng 10 nhật ký gần nhất, mới → cũ, chỉ của cây này', () => {
    const r = recentLogs(logs, 'SR03');
    expect(r).toHaveLength(10);
    expect(r[0].date).toBe('2026-11-20');
    expect(r.some((l) => l.targetId !== 'SR03')).toBe(false);
    expect(p).toContain('Emamectin benzoate · PHI 21 ngày');
  });
  it('[1.2] yêu cầu thương hiệu, nhóm FRAC/IRAC, quy cách, giá tham khảo, cách dùng; liều đối chiếu nhãn; Danh mục', () => {
    for (const s of ['thương hiệu', 'FRAC/IRAC', 'quy cách', 'giá tham khảo', 'cách dùng', 'đối chiếu nhãn', 'Danh mục thuốc BVTV']) expect(p).toContain(s);
    expect(p).not.toMatch(/KHÔNG nêu liều/);
  });
});
