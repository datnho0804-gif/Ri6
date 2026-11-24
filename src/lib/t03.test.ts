import { describe, expect, it } from 'vitest';
import { irrigation } from './irrigation';
import { phiMessage, phiWarning, sprayLogsWithoutPhi } from './phi';
import { PROTOCOLS, PROTOCOL_DISCLAIMER, searchProtocols } from './protocols';
import { buildPrunePrompt, pruneLevel, pruneLogNote } from './pruning';
import { harvestWindow, ri6Day, ri6Milestones } from './ri6';
import { makeLog, makeTree } from './testFixtures';

describe('pruneLevel (T03 AC1)', () => {
  const s = (n: number, sucker = false) => Array.from({ length: 6 }, (_, i) => (i === 0 ? sucker : i <= n));
  it.each([
    [[false, false, false, false, false, false], 'Không cần'],
    [[false, true, false, false, false, false], 'Nhẹ'],
    [[false, true, true, false, false, false], 'Nhẹ'],
    [[false, true, true, true, false, false], 'Vừa'],
    [[false, true, true, true, true, false], 'Vừa'],
    [[true, true, true, true, true, false], 'Mạnh'],
    [[true, true, true, true, true, true], 'Mạnh'],
  ])('%j → %s', (signs, label) => expect(pruneLevel(signs).label).toBe(label));
  it('chồi gốc ghép → removeSuckersNow', () => {
    expect(pruneLevel(s(0, true))).toMatchObject({ count: 1, label: 'Nhẹ', removeSuckersNow: true });
    expect(pruneLogNote(s(0, true))).toContain('Cắt bỏ chồi gốc ghép ngay');
  });
  it('sai số dấu hiệu → lỗi', () => expect(() => pruneLevel([true])).toThrow());
  it('prompt cắt tỉa có 3 góc ảnh và mức đánh giá', () => {
    const p = buildPrunePrompt({ tree: makeTree({ id: 'SR03', ageYears: 4 }), signs: s(3), season: 'kho', today: '2026-11-24' });
    expect(p).toContain('mức "Vừa"');
    expect(p).toContain('toàn tán 2 hướng');
    expect(p).toContain('Lộc Tấn');
  });
});

describe('ri6Milestones (T03 AC3)', () => {
  const pick = (ms: ReturnType<typeof ri6Milestones>, key: string) => ms.find((m) => m.key === key)!;
  it('xổ nhụy 2027-01-25 → đúng bảng test vector', () => {
    const ms = ri6Milestones({ kind: 'xo-nhuy', date: '2027-01-25' });
    expect(ms.map((m) => m.key)).toEqual(['tuoi-nhap', 'chan-dot', 'kali', 'len-com', 'giam-dam', 'thu-hoach']);
    expect(pick(ms, 'tuoi-nhap')).toMatchObject({ kind: 'until', earliest: '2027-01-28', latest: '2027-02-01' });
    expect(pick(ms, 'chan-dot')).toMatchObject({ kind: 'until', earliest: '2027-02-24', latest: '2027-02-24' });
    expect(pick(ms, 'kali')).toMatchObject({ earliest: '2027-03-21', latest: '2027-03-31' });
    expect(pick(ms, 'len-com')).toMatchObject({ earliest: '2027-03-26', latest: '2027-03-31' });
    expect(pick(ms, 'giam-dam')).toMatchObject({ kind: 'from', earliest: '2027-03-28' });
    expect(pick(ms, 'thu-hoach')).toMatchObject({ earliest: '2027-04-25', latest: '2027-05-10' });
  });
  it('mắt cua 2026-12-01 → xổ nhụy 25–27/01, thu hoạch 25/04 – 12/05/2027', () => {
    const ms = ri6Milestones({ kind: 'mat-cua', date: '2026-12-01' });
    expect(pick(ms, 'xo-nhuy')).toMatchObject({ earliest: '2027-01-25', latest: '2027-01-27' });
    expect(pick(ms, 'thu-hoach')).toMatchObject({ earliest: '2027-04-25', latest: '2027-05-12' });
  });
  it('ri6Day / harvestWindow', () => {
    expect(ri6Day('2026-09-26', '2026-11-24')).toBe(59);
    expect(harvestWindow('2026-09-26')).toEqual({ from: '2026-12-25', to: '2027-01-09' });
  });
});

describe('irrigation (T03 AC4)', () => {
  it('30/50/180/15/3 → 1,5 + 2,7 = 4,2 m³/lần; 12,6 m³/tuần; không cảnh báo', () => {
    const r = irrigation({ aLiters: 30, aCount: 50, bLiters: 180, bCount: 15, perWeek: 3 });
    expect([r.lotA.m3, r.lotB.m3, r.totalM3, r.weeklyM3]).toEqual([1.5, 2.7, 4.2, 12.6]);
    expect(r.warnings).toEqual([]);
  });
  it('aLiters 45, bLiters 120 → 2 cảnh báo nhưng vẫn tính', () => {
    const r = irrigation({ aLiters: 45, aCount: 50, bLiters: 120, bCount: 15 });
    expect(r.warnings.map((w) => w.lot)).toEqual(['A', 'B']);
    expect(r.totalM3).toBe(4.05);
    expect(r.weeklyM3).toBeUndefined();
  });
  it('số âm → lỗi', () => expect(() => irrigation({ aLiters: -1, aCount: 50, bLiters: 180, bCount: 15 })).toThrow());
});

describe('phiWarning (T03 AC6)', () => {
  const spray = (date: string, phiDays?: number, id = date) =>
    makeLog({ id, targetId: 'SR03', date, type: 'phun-thuoc', activeIngredient: 'Emamectin benzoate', phiDays });
  it('xổ nhụy 25/01 + phun 10/04 PHI 21 → "Không thu hoạch trước 01/05/2027"', () => {
    const w = phiWarning('2027-01-25', [spray('2027-04-10', 21)]);
    expect(w).toMatchObject({ notBefore: '2027-05-01', harvestFrom: '2027-04-25' });
    expect(phiMessage(w!)).toBe('Không thu hoạch trước 01/05/2027 (PHI Emamectin benzoate)');
  });
  it('phun 20/03 PHI 14 → không cảnh báo', () => expect(phiWarning('2027-01-25', [spray('2027-03-20', 14)])).toBeNull());
  it('lấy ngày muộn nhất; bỏ log đã xóa, cây khác, chưa rõ PHI', () => {
    const logs = [spray('2027-04-10', 21, 'a'), spray('2027-04-15', 21, 'b'), { ...spray('2027-04-20', 30, 'c'), deletedAt: 'x' }, { ...spray('2027-04-20', 30, 'd'), targetId: 'SR04' }, spray('2027-04-22', undefined, 'e')];
    expect(phiWarning('2027-01-25', logs, 'SR03')?.logId).toBe('b');
    expect(sprayLogsWithoutPhi(logs, 'SR03').map((l) => l.id)).toEqual(['e']);
  });
});

describe('Phác đồ (T03 AC5 [1.1])', () => {
  it('đúng 8 phác đồ, mỗi phác đồ đủ 5 bước, không bước nào rỗng', () => {
    expect(PROTOCOLS).toHaveLength(8);
    for (const p of PROTOCOLS) {
      expect(p.steps.map((s) => s.key)).toEqual(['nhan-dinh', 'kiem-tra', 'canh-tac', 'xu-ly', 'theo-doi']);
      for (const s of p.steps) expect(s.groups.flatMap((gr) => gr.items).filter((t) => t.trim()).length).toBeGreaterThan(0);
    }
  });
  it('phác đồ 7 và 8 chia mục con theo đối tượng ở bước 1', () => {
    expect(PROTOCOLS[6].steps[0].groups.map((gr) => gr.label)).toEqual(['Sâu đục trái', 'Rệp sáp']);
    expect(PROTOCOLS[7].steps[0].groups.map((gr) => gr.label)).toEqual(['Xén tóc', 'Mọt đục cành']);
  });
  it('rụng trái/cháy múi là sinh lý: bước 4 "Dinh dưỡng & nước", không có hoạt chất', () => {
    const p = PROTOCOLS.find((x) => x.id === 'rung-trai-chay-mui')!;
    expect(p.steps[3].title).toBe('Dinh dưỡng & nước');
    expect(p.actives).toEqual([]);
  });
  it('mọi hoạt chất có nhóm cơ chế; không có liều lượng (số + đơn vị)', () => {
    const all = JSON.stringify(PROTOCOLS);
    for (const p of PROTOCOLS) for (const a of p.actives) expect(a.group).toMatch(/^(FRAC|IRAC|Sinh học|Vật lý)/);
    expect(all).not.toMatch(/\d+\s*(ml|g|cc|lít|kg)\s*\/\s*(bình|lít|ha|cây|gốc)/i);
    expect(PROTOCOL_DISCLAIMER).toContain('Danh mục thuốc BVTV');
  });
  it('tìm không dấu', () => {
    expect(searchProtocols('nhen do').map((p) => p.id)).toEqual(['nhen-do']);
    expect(searchProtocols('emamectin').map((p) => p.id)).toEqual(['duc-trai-rep-sap', 'mot-xen-toc']);
    expect(searchProtocols('')).toHaveLength(8);
  });
});
