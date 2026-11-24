import { describe, expect, it } from 'vitest';
import type { AiMemory } from '../types/models';
import { AI_MEMORY, DEFAULT_INITIAL_TREES, IRRIGATION, MULCH, ROTATION_ALERT } from './agronomy';
import {
  approveMemory,
  createMemory,
  deduplicateMemories,
  deleteMemory,
  editMemory,
  isActiveMemory,
  logInsights,
  looksSensitive,
  memoryKey,
  selectRelevantMemories,
} from './ai/memory';
import { buildExport, parseImportFile } from './exportImport';
import { convertLegacyBackup } from './legacyImport';
import { diffCounts, emptySyncState, hasChanges, mergeState, type SyncState } from './merge';
import { PROTOCOLS } from './protocols';
import { SEASON_ADVICE } from './season';
import {
  BANNED_ACTIVE_INGREDIENTS,
  filterSupplies,
  formatPrice,
  getSuppliesForProtocol,
  isBannedActive,
  learnedPrice,
  moaGroupOf,
  priceLine,
  rotationAlerts,
  searchSupplies,
  SUPPLIES,
  supplyById,
  SUPPLY_PRICE_DISCLAIMER,
} from './supplies';
import { parseState, serializeState } from './sync/stateFile';
import { DEV, makeLog, makeTree, T0 } from './testFixtures';

/* ===================== Vật tư (T07 AC2) ===================== */
describe('SUPPLIES — danh mục vật tư (T07 AC2 [1.2])', () => {
  it('đủ 3 nhóm, id duy nhất, không thiếu trường bắt buộc', () => {
    for (const c of ['thuoc_bvtv', 'phan_bon', 'vat_tu'] as const) expect(filterSupplies({ category: c }).length).toBeGreaterThan(0);
    expect(new Set(SUPPLIES.map((s) => s.id)).size).toBe(SUPPLIES.length);
    for (const s of SUPPLIES) {
      for (const k of ['name', 'brand', 'activeIngredient', 'usageGuide', 'doseNote', 'safetyNote'] as const) expect(s[k].trim(), `${s.id}.${k}`).not.toBe('');
      expect(s.packaging.length, s.id).toBeGreaterThan(0);
    }
  });
  it('giá: chỉ khi có nguồn + tháng; min ≤ max, > 0', () => {
    for (const s of SUPPLIES) {
      if (!s.price) continue;
      expect(s.price.rangeVnd[0]).toBeGreaterThan(0);
      expect(s.price.rangeVnd[0]).toBeLessThanOrEqual(s.price.rangeVnd[1]);
      expect(s.price.asOf).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(s.price.source.trim()).not.toBe('');
    }
    expect(SUPPLY_PRICE_DISCLAIMER).toContain('tham khảo');
  });
  it('thuốc BVTV: có nhóm FRAC/IRAC (trừ dầu khoáng), nhóm chính khớp phác đồ liên kết', () => {
    for (const s of filterSupplies({ category: 'thuoc_bvtv' })) {
      if (s.id === 'sk-enspray-99ec') continue;
      expect(s.moaGroup, s.id).toMatch(/^(FRAC|IRAC) /);
      const main = s.moaGroup!.split(' + ')[0];
      for (const pid of s.protocolIds) {
        const p = PROTOCOLS.find((x) => x.id === pid);
        expect(p, `${s.id} → ${pid}`).toBeDefined();
        expect(p!.actives.some((a) => a.group === main), `${s.id}: ${main} có trong phác đồ ${pid}`).toBe(true);
      }
    }
  });
  it('không có hoạt chất đã bị loại khỏi Danh mục', () => {
    expect(BANNED_ACTIVE_INGREDIENTS).toContain('Carbendazim');
    for (const s of SUPPLIES) expect(isBannedActive(s.activeIngredient), s.id).toBe(false);
    expect(isBannedActive('Chlorpyrifos Ethyl 48%')).toBe(true);
    expect(isBannedActive('Abamectin')).toBe(false);
  });
  it('liên kết phác đồ: phác đồ sâu bệnh chính đều có sản phẩm', () => {
    for (const id of ['phytophthora', 'rhizoctonia', 'nam-hong', 'ray', 'nhen-do', 'duc-trai-rep-sap', 'mot-xen-toc']) {
      expect(getSuppliesForProtocol(id).length, id).toBeGreaterThan(0);
    }
    expect(getSuppliesForProtocol('khong-co')).toEqual([]);
  });
  it('filterSupplies theo nhóm cơ chế; searchSupplies có/không dấu', () => {
    expect(filterSupplies({ moaGroup: 'IRAC 6' }).map((s) => s.id).sort()).toEqual(['proclaim-1-9ec', 'reasgant-3-6ec']);
    expect(filterSupplies({ moaGroup: 'M03' }).map((s) => s.id).sort()).toEqual(['acrobat-mz-90-600wp', 'ridomil-gold-68wg']);
    expect(searchSupplies('nhen do').map((s) => s.id)).toContain('nissorun-5ec');
    expect(searchSupplies('Nhện đỏ')).toEqual(searchSupplies('nhen do'));
    expect(searchSupplies('phu my ure').map((s) => s.id)).toEqual(['ure-phu-my']);
    expect(searchSupplies('  ')).toHaveLength(SUPPLIES.length);
    expect(supplyById('movento-150od')?.moaGroup).toBe('IRAC 23');
    expect(supplyById(undefined)).toBeUndefined();
  });
  it('giá: định dạng tham khảo; giá vườn đã mua (học từ nhật ký) được ưu tiên', () => {
    const ure = supplyById('ure-phu-my')!;
    expect(formatPrice(ure.price)).toBe('610.000–660.000 đ/bao 50 kg · giá tham khảo 11/2026');
    expect(formatPrice(undefined)).toBe('Chưa có giá tham khảo');
    const logs = [
      makeLog({ id: 'a', targetId: 'SR01', date: '2026-10-01', type: 'bon-phan', supplyId: 'ure-phu-my', priceVnd: 600000 }),
      makeLog({ id: 'b', targetId: 'SR02', date: '2026-11-10', type: 'bon-phan', supplyId: 'ure-phu-my', priceVnd: 640000 }),
      makeLog({ id: 'c', targetId: 'SR02', date: '2026-11-20', type: 'bon-phan', supplyId: 'ure-phu-my', priceVnd: 999, deletedAt: T0 }),
      makeLog({ id: 'd', targetId: 'SR02', date: '2026-11-21', type: 'bon-phan', supplyId: 'ure-phu-my', priceVnd: 0 }),
    ];
    expect(learnedPrice(logs, 'ure-phu-my')).toEqual({ priceVnd: 640000, date: '2026-11-10', logId: 'b' });
    expect(learnedPrice(logs, 'kali-phu-my')).toBeNull();
    expect(priceLine(ure, logs)).toBe('640.000 đ (giá vườn mua 10/11/2026)');
    expect(priceLine(ure, [])).toContain('giá tham khảo');
  });
});

describe('moaGroupOf / rotationAlerts — nhắc luân phiên (T07 AC2)', () => {
  it('nhận nhóm theo supplyId hoặc dò tên hoạt chất (không dấu, trong chuỗi dài)', () => {
    expect(moaGroupOf({ supplyId: 'ortus-5sc' })).toBe('IRAC 21A');
    expect(moaGroupOf({ activeIngredient: 'emamectin BENZOATE 5%' })).toBe('IRAC 6');
    expect(moaGroupOf({ activeIngredient: 'Phosphonate' })).toBe('FRAC P07');
    expect(moaGroupOf({ activeIngredient: 'Imidacloprid' })).toBe('IRAC 4A');
    expect(moaGroupOf({ activeIngredient: 'nước lã' })).toBeNull();
    expect(moaGroupOf({})).toBeNull();
  });
  it('2 lần cùng nhóm trong 30 ngày → cảnh báo; khác cây / quá 30 ngày / đã xóa → không tính', () => {
    const spray = (id: string, targetId: string, date: string, ai: string, extra = {}) =>
      makeLog({ id, targetId, date, type: 'phun-thuoc', activeIngredient: ai, phiDays: 7, ...extra });
    const logs = [
      spray('1', 'SR01', '2026-11-01', 'Abamectin'),
      spray('2', 'SR01', '2026-11-20', 'Emamectin benzoate'),
      spray('3', 'SR02', '2026-11-20', 'Abamectin'),
      spray('4', 'SR02', '2026-10-01', 'Abamectin'),
      spray('5', 'SR02', '2026-11-21', 'Abamectin', { deletedAt: T0 }),
      makeLog({ id: '6', targetId: 'SR02', date: '2026-11-22', type: 'bon-phan', activeIngredient: 'Abamectin' }),
    ];
    expect(rotationAlerts(logs, '2026-11-24', ROTATION_ALERT)).toEqual([{ targetId: 'SR01', group: 'IRAC 6', count: 2, lastDate: '2026-11-20' }]);
  });
});

/* ===================== Mặc định 3 cây (T07 AC1) ===================== */
describe('Khởi tạo mặc định 3 cây (T07 AC1 [1.2])', () => {
  it('DEFAULT_INITIAL_TREES = 3', () => expect(DEFAULT_INITIAL_TREES).toBe(3));
  it('nhập file app cũ SR01–SR15 vào vườn 3 cây: tạo cây thiếu, khớp cây thêm tay theo mã (không tạo trùng mã)', () => {
    const existing = [makeTree({ id: 'SR03' }), makeTree({ id: 'uuid-4', code: 'SR04' }), makeTree({ id: 'uuid-old', code: 'SR05', deletedAt: T0 })];
    const legacy = {
      trees: ['SR03', 'SR04', 'SR05'].map((id) => ({ id, name: `${id} - Bờ mương`, logs: [{ date: '2026-11-01', type: 'Bón phân', note: 'NPK' }] })),
      youngBatchLogs: [],
    };
    const s = convertLegacyBackup(legacy, { deviceId: DEV, now: ctx.now, existingTrees: existing });
    expect(s.trees.map((t) => [t.id, t.code, t.label])).toEqual([
      ['SR03', 'SR03', 'SR03 - Bờ mương'],
      ['uuid-4', 'SR04', 'SR04 - Bờ mương'],
      ['SR05', 'SR05', 'SR05 - Bờ mương'],
    ]);
    expect(s.logs.map((l) => l.targetId)).toEqual(['SR03', 'uuid-4', 'SR05']);
  });
});

/* ===================== Khuyến cáo theo mùa ===================== */
describe('SEASON_ADVICE (SPEC §3.4) — số liệu từ agronomy.ts', () => {
  it('mùa khô: tưới Lô A, tủ gốc đúng SPEC §3.1, xiết nước khi đủ cơi đọt, không phun vào thân', () => {
    const k = SEASON_ADVICE.kho.recommendations.join(' ');
    expect(k).toContain(`${IRRIGATION.lotA.min}–${IRRIGATION.lotA.max} L`);
    expect(k).toContain(`dày ${MULCH.thicknessCm[0]}–${MULCH.thicknessCm[1]} cm`);
    expect(k).toContain(`cách gốc ${MULCH.gapFromTrunkCm[0]}–${MULCH.gapFromTrunkCm[1]} cm`);
    for (const s of ['đủ cơi đọt', 'nhện đỏ', 'rầy xanh', 'thân']) expect(k).toContain(s);
  });
  it('mùa mưa: đủ 5 khuyến cáo tối thiểu', () => {
    const m = SEASON_ADVICE.mua.recommendations.join(' ');
    expect(SEASON_ADVICE.mua.recommendations).toHaveLength(5);
    for (const s of ['thoát nước', 'xì mủ', 'mỗi tuần', 'vôi', 'Trichoderma', 'cháy lá', 'nấm hồng', 'sau thu hoạch', '5,5–6,5']) expect(m).toContain(s);
  });
});

/* ===================== Bộ nhớ AI (T07 AC3) ===================== */
const ctx = { now: '2026-11-25T00:00:00.000Z', deviceId: DEV };
const mem = (over: Partial<AiMemory> & { id: string; content: string }): AiMemory => ({
  category: 'kinh-nghiem',
  source: 'ai',
  approved: true,
  createdAt: T0,
  updatedAt: T0,
  updatedBy: DEV,
  ...over,
});

describe('AiMemory — tạo / duyệt / sửa / xóa mềm (T07 AC3)', () => {
  it('nhập tay → đã duyệt; AI đề xuất → chờ duyệt; nội dung được chuẩn hóa, cắt độ dài', () => {
    const m = createMemory({ content: '  SR02   hay vàng lá sau mưa  ', category: 'kinh-nghiem', targetIds: ['SR02', 'SR02'], source: 'manual' }, { ...ctx, id: 'm1' });
    expect(m).toMatchObject({ id: 'm1', content: 'SR02 hay vàng lá sau mưa', targetIds: ['SR02'], approved: true, createdAt: ctx.now, updatedBy: DEV });
    const ai = createMemory({ content: 'x'.repeat(500), category: 'khac', source: 'ai' }, { ...ctx, id: 'm2' });
    expect(ai.approved).toBe(false);
    expect(ai.content.length).toBe(AI_MEMORY.maxLength);
    expect(ai.content.endsWith('…')).toBe(true);
    expect(ai.targetIds).toBeUndefined();
  });
  it('từ chối nội dung rỗng hoặc trông như khóa bí mật', () => {
    expect(() => createMemory({ content: '   ', category: 'khac', source: 'manual' }, { ...ctx, id: 'x' })).toThrow();
    expect(() => createMemory({ content: 'token của tôi là ghp_abc', category: 'khac', source: 'manual' }, { ...ctx, id: 'x' })).toThrow();
    expect(looksSensitive('AIzaSyD-1234567890abcdef')).toBe(true);
    expect(looksSensitive('Mật khẩu wifi 1234')).toBe(true);
    expect(looksSensitive('SR02 hợp Movento hơn Actara')).toBe(false);
  });
  it('duyệt / sửa / xóa mềm cập nhật updatedAt + updatedBy', () => {
    const m = mem({ id: 'a', content: 'A', approved: false, targetIds: ['SR01'] });
    expect(approveMemory(m, ctx)).toMatchObject({ approved: true, updatedAt: ctx.now });
    const e = editMemory(m, { content: ' B ', targetIds: [] }, ctx);
    expect(e.content).toBe('B');
    expect(e.targetIds).toBeUndefined();
    expect(() => editMemory(m, { content: 'api key: 123' }, ctx)).toThrow();
    const d = deleteMemory(m, ctx);
    expect(d.deletedAt).toBe(ctx.now);
    expect(isActiveMemory(d)).toBe(false);
  });
});

describe('deduplicateMemories / selectRelevantMemories (T07 AC3)', () => {
  const existing = [mem({ id: 'e1', content: 'Cây SR02 hay bị nhện đỏ vào tháng 2.' }), mem({ id: 'e2', content: 'Đã xóa', deletedAt: T0 })];
  it('bỏ trùng (không dấu, không hoa thường, bỏ dấu câu), trùng nhau, nhạy cảm; tối đa 3', () => {
    expect(memoryKey('Cây SR02 — hay bị NHỆN ĐỎ!')).toBe('cay sr02 hay bi nhen do');
    const out = deduplicateMemories(
      [
        { content: 'cay sr02 hay bi nhen do vao thang 2', category: 'kinh-nghiem' },
        { content: 'Đã xóa', category: 'khac' },
        { content: 'Mua phân ở đại lý Lộc Tấn', category: 'vat-tu' },
        { content: 'mua phân ở đại lý lộc tấn.', category: 'vat-tu' },
        { content: 'token ghp_x', category: 'khac' },
        { content: 'B', category: 'khac' },
        { content: 'C', category: 'khac' },
        { content: 'D', category: 'khac' },
      ],
      existing,
    );
    expect(out.map((p) => p.content)).toEqual(['Đã xóa', 'Mua phân ở đại lý Lộc Tấn', 'B']);
  });
  it('chỉ mục đã duyệt; có cây → của cây đó trước, rồi chung vườn, bỏ cây khác; mới trước; giới hạn', () => {
    const list = [
      mem({ id: 'g-old', content: 'chung cũ', updatedAt: '2026-01-01T00:00:00Z' }),
      mem({ id: 'g-new', content: 'chung mới', updatedAt: '2026-11-01T00:00:00Z' }),
      mem({ id: 'sr1', content: 'của SR01', targetIds: ['SR01'] }),
      mem({ id: 'sr2', content: 'của SR02', targetIds: ['SR02'] }),
      mem({ id: 'pending', content: 'chờ duyệt', approved: false }),
      mem({ id: 'del', content: 'đã xóa', deletedAt: T0 }),
    ];
    expect(selectRelevantMemories(list, { targetId: 'SR01' }).map((m) => m.id)).toEqual(['sr1', 'g-new', 'g-old']);
    expect(selectRelevantMemories(list).map((m) => m.id).sort()).toEqual(['g-new', 'g-old', 'sr1', 'sr2']);
    expect(selectRelevantMemories(list, { targetId: 'SR01', limit: 2 }).map((m) => m.id)).toEqual(['sr1', 'g-new']);
  });
  it('logInsights: nhắc luân phiên (đổi id → mã cây) + giá vườn mua', () => {
    const trees = [makeTree({ id: 'u-1', code: 'SR04' })];
    const logs = [
      makeLog({ id: '1', targetId: 'u-1', date: '2026-11-01', type: 'phun-thuoc', activeIngredient: 'Abamectin', phiDays: 7 }),
      makeLog({ id: '2', targetId: 'u-1', date: '2026-11-20', type: 'phun-thuoc', supplyId: 'proclaim-1-9ec', phiDays: 7 }),
      makeLog({ id: '3', targetId: 'LOT_A', date: '2026-11-02', type: 'bon-phan', supplyId: 'kali-phu-my', priceVnd: 550000 }),
    ];
    const out = logInsights({ logs, today: '2026-11-24', trees });
    expect(out[0]).toMatch(/^SR04 đã phun nhóm IRAC 6 2 lần trong 30 ngày \(gần nhất 20\/11\/2026\)/);
    expect(out[1]).toBe('Giá vườn mua Kali Phú Mỹ (KCl) gần nhất: 550.000 đ (02/11/2026).');
    expect(logInsights({ logs, today: '2026-11-24', trees, targetId: 'SR99' })).toEqual([out[1]]);
  });
});

/* ===================== Đồng bộ aiMemories (T07 AC3) ===================== */
describe('aiMemories trong SyncState — tương thích ngược (T07 AC3)', () => {
  const m1 = mem({ id: 'm1', content: 'A' });
  const old = { trees: [makeTree({ id: 'SR01' })], lots: [], logs: [], tasks: [], photos: [] } as SyncState;
  it('merge: thiếu khóa coi như []; LWW + tombstone như các bảng khác', () => {
    expect(mergeState(old, emptySyncState()).aiMemories).toEqual([]);
    const a = { ...old, aiMemories: [m1] };
    const b = { ...old, aiMemories: [{ ...m1, deletedAt: ctx.now, updatedAt: ctx.now }] };
    expect(mergeState(a, b).aiMemories![0].deletedAt).toBe(ctx.now);
    expect(mergeState(a, b)).toEqual(mergeState(b, a));
    const c = diffCounts(old, a);
    expect(c.aiMemories).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(hasChanges(c)).toBe(true);
    expect(hasChanges(diffCounts(a, old))).toBe(false);
  });
  it('state.json cũ (không có aiMemories) đọc được; ghi ra luôn có khóa', () => {
    const text = JSON.stringify({ schemaVersion: 1, trees: [], lots: [], logs: [], tasks: [], photos: [] });
    expect(parseState(text).aiMemories).toEqual([]);
    expect(JSON.parse(serializeState(old)).aiMemories).toEqual([]);
    expect(parseState(serializeState({ ...old, aiMemories: [m1] })).aiMemories).toEqual([m1]);
  });
  it('file xuất JSON chứa aiMemories, không chứa khóa bí mật; file cũ nhập được', () => {
    const leaked = { ...m1, githubToken: 'ghp_SECRET' } as AiMemory;
    const f = buildExport({ ...old, aiMemories: [leaked] }, { exportedAt: ctx.now, appVersion: '0.5.0' });
    expect(JSON.stringify(f)).not.toContain('SECRET');
    expect(f.data.aiMemories).toHaveLength(1);
    const oldFile = JSON.stringify({ app: 'so-tay-vuon-ri6', schemaVersion: 1, exportedAt: ctx.now, appVersion: '0.4.0', data: old });
    const r = parseImportFile(oldFile);
    expect(r.ok && r.kind === 'ri6' && r.data.aiMemories).toEqual([]);
  });
});
