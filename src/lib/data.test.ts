import { describe, expect, it } from 'vitest';
import { buildExport, importToSyncState, parseImportFile } from './exportImport';
import { convertLegacyBackup, isLegacyBackup } from './legacyImport';
import { diffCounts, emptySyncState, hasChanges, mergeById, mergeState, pickWinner, type SyncState } from './merge';
import { makeLog, makeLot, makeTree, T0 } from './testFixtures';

const tA = (over = {}) => makeTree({ id: 'SR01', label: 'A', updatedAt: '2026-11-24T10:00:00.000Z', updatedBy: 'dev-a', ...over });

describe('merge — LWW theo bản ghi (SPEC §6, dùng lại ở T04)', () => {
  it('bản mới hơn thắng', () => {
    const newer = tA({ label: 'B', updatedAt: '2026-11-24T11:00:00.000Z' });
    expect(pickWinner(tA(), newer)).toBe(newer);
    expect(pickWinner(newer, tA())).toBe(newer);
  });
  it('updatedAt bằng nhau → updatedBy lớn hơn thắng', () => {
    const b = tA({ label: 'B', updatedBy: 'dev-b' });
    expect(pickWinner(tA(), b).label).toBe('B');
    expect(pickWinner(b, tA()).label).toBe('B');
  });
  it('tombstone mới hơn thắng bản sửa cũ; bản sửa mới hơn thắng tombstone cũ', () => {
    const del = tA({ deletedAt: '2026-11-24T12:00:00.000Z', updatedAt: '2026-11-24T12:00:00.000Z' });
    expect(pickWinner(tA({ label: 'edit', updatedAt: '2026-11-24T11:00:00.000Z' }), del).deletedAt).toBeDefined();
    expect(pickWinner(tA({ label: 'edit', updatedAt: '2026-11-24T13:00:00.000Z' }), del).deletedAt).toBeUndefined();
  });
  it('hai bên thêm nhật ký khác nhau → hợp được cả hai, sắp theo id', () => {
    const r = mergeById([makeLog({ id: 'b', targetId: 'SR01', date: '2026-11-24' })], [makeLog({ id: 'a', targetId: 'SR01', date: '2026-11-24' })]);
    expect(r.map((l) => l.id)).toEqual(['a', 'b']);
  });
  const s1: SyncState = { ...emptySyncState(), trees: [tA(), makeTree({ id: 'SR02' })], logs: [makeLog({ id: 'l1', targetId: 'SR01', date: '2026-11-20' })], lots: [makeLot()] };
  const s2: SyncState = { ...emptySyncState(), trees: [tA({ label: 'B', updatedBy: 'dev-b' })], logs: [makeLog({ id: 'l2', targetId: 'SR02', date: '2026-11-21' })] };
  it('lũy đẳng: merge(a,a) = a (đã sắp xếp)', () => expect(mergeState(mergeState(s1, s1), s1)).toEqual(mergeState(s1, emptySyncState())));
  it('giao hoán: merge(a,b) = merge(b,a)', () => expect(mergeState(s1, s2)).toEqual(mergeState(s2, s1)));
  it('diffCounts / hasChanges cho bước xem trước nhập JSON', () => {
    const c = diffCounts(s1, s2);
    expect(c.trees).toEqual({ added: 0, updated: 1, unchanged: 0 });
    expect(c.logs).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(hasChanges(c)).toBe(true);
    expect(hasChanges(diffCounts(s1, s1))).toBe(false);
  });
});

describe('Xuất / nhập JSON (T02 AC7)', () => {
  it('file xuất KHÔNG chứa githubToken / geminiApiKey, kể cả khi lỡ có trong bản ghi', () => {
    const dirty = { ...emptySyncState(), trees: [{ ...makeTree({ id: 'SR01' }), githubToken: 'ghp_SECRET', nested: { geminiApiKey: 'AIza_SECRET' } } as never] };
    const text = JSON.stringify(buildExport(dirty, { exportedAt: T0, appVersion: '0.3.0' }));
    expect(text).not.toMatch(/githubToken|geminiApiKey|ghp_SECRET|AIza_SECRET/);
    expect(text).toContain('"app":"so-tay-vuon-ri6"');
  });
  it('xuất → nhập lại cho ra đúng dữ liệu', () => {
    const s = { ...emptySyncState(), trees: [makeTree({ id: 'SR01', label: 'Góc cổng' })], logs: [makeLog({ id: 'l1', targetId: 'SR01', date: '2026-11-20' })] };
    const parsed = parseImportFile(JSON.stringify(buildExport(s, { exportedAt: T0, appVersion: '0.3.0' })));
    expect(parsed.ok && parsed.kind === 'ri6' && parsed.data).toEqual(s);
  });
  it('báo lỗi rõ ràng: không phải JSON, sai app, schema mới hơn, bản ghi hỏng', () => {
    expect(parseImportFile('{oops')).toMatchObject({ ok: false });
    expect(parseImportFile('{"app":"khac","data":{}}')).toMatchObject({ ok: false });
    expect(parseImportFile(JSON.stringify({ app: 'so-tay-vuon-ri6', schemaVersion: 99, data: {} }))).toMatchObject({ ok: false });
    expect(parseImportFile(JSON.stringify({ app: 'so-tay-vuon-ri6', schemaVersion: 1, data: { trees: [{ id: 1 }] } }))).toMatchObject({ ok: false });
  });
});

describe('Nhập file app cũ legacy/index.html (T02 AC8)', () => {
  const legacy = {
    season: 'dry',
    trees: [
      { id: 'SR01', name: 'SR01 - Góc cổng', age: 4, stage: 'Đang nuôi trái', status: 'watch', lastPhotoDate: '2026-11-20', photos: [{ date: '2026-11-20', dataUrl: 'data:image/jpeg;base64,xx' }],
        logs: [{ date: '2026-11-20', type: 'Phun thuốc BVTV', note: 'Phun rầy' }, { date: '2026-11-18', type: 'Bón phân', note: 'NPK' }] },
      { id: 'SR02', name: 'SR02 - Chưa đặt vị trí', age: '3', stage: 'Lá lụa / Lá già', status: 'pruning', logs: [] },
    ],
    youngBatchLogs: [{ date: '2026-11-19', type: 'Tủ gốc / Chỉnh béc', note: 'Tủ rơm' }],
    pruningPhotos: { 1: null },
  };
  const existing = [makeTree({ id: 'SR01', flowerDate: '2026-09-26' }), makeTree({ id: 'SR02' })];
  const ctx = { deviceId: 'dev', now: '2026-11-25T00:00:00.000Z', existingTrees: existing };

  it('nhận diện đúng định dạng cũ', () => {
    expect(isLegacyBackup(legacy)).toBe(true);
    const p = parseImportFile(JSON.stringify(legacy));
    expect(p.ok && p.kind).toBe('legacy');
  });
  it('vá thông tin cây, giữ trường mới (flowerDate), bỏ ảnh', () => {
    const s = convertLegacyBackup(legacy, ctx);
    expect(s.trees[0]).toMatchObject({ id: 'SR01', label: 'SR01 - Góc cổng', ageYears: 4, stage: 'nuoi-trai', diseaseWatch: true, health: 'theo-doi', flowerDate: '2026-09-26' });
    expect(s.trees[1]).toMatchObject({ id: 'SR02', label: 'SR02', ageYears: 3, stage: null, needsPruning: true });
    expect(s.photos).toEqual([]);
  });
  it('nhật ký: map loại, giữ loại gốc trong ghi chú, Lô A → LOT_A, không bịa PHI', () => {
    const s = convertLegacyBackup(legacy, ctx);
    const spray = s.logs.find((l) => l.note.includes('Phun rầy'))!;
    expect(spray).toMatchObject({ targetId: 'SR01', type: 'phun-thuoc', note: '[Từ app cũ: Phun thuốc BVTV] Phun rầy' });
    expect(spray.phiDays).toBeUndefined();
    expect(s.logs.find((l) => l.note.includes('NPK'))).toMatchObject({ type: 'bon-phan', fertilizerKind: 'khac' });
    expect(s.logs.find((l) => l.targetId === 'LOT_A')).toMatchObject({ type: 'khac', date: '2026-11-19' });
  });
  it('nhập 2 lần không nhân đôi nhật ký (id tất định)', () => {
    const a = convertLegacyBackup(legacy, ctx);
    const b = convertLegacyBackup(legacy, { ...ctx, now: '2026-11-26T00:00:00.000Z' });
    expect(mergeState(a, b).logs).toHaveLength(a.logs.length);
  });
  it('importToSyncState xử lý cả 2 loại file', () => {
    const p = parseImportFile(JSON.stringify(legacy));
    if (!p.ok) throw new Error('parse');
    expect(importToSyncState(p, ctx).logs.length).toBe(3);
  });
});
