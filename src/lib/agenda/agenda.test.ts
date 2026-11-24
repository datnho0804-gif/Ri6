import { describe, expect, it } from 'vitest';
import { buildAgenda, groupAgenda, markDone, newTask, snooze, summarizeAgenda } from './agenda';
import { agendaItemCalendarUrl, calendarUrl, weeklyPhotoReminderUrl } from './calendar';
import { buildAgendaNotification, shouldNotify } from './notify';
import { emptySyncState, type SyncState } from '../merge';
import { makeLog, makeLot, makePhoto, makeTree, seqIds } from '../testFixtures';

const TODAY = '2026-11-24';
const st = (over: Partial<SyncState>): SyncState => ({ ...emptySyncState(), lots: [makeLot()], ...over });
const keys = (s: SyncState, today = TODAY) => buildAgenda(s, today).map((i) => i.key);
const byKey = (s: SyncState, k: string, today = TODAY) => buildAgenda(s, today).find((i) => i.key === k);
const photoOk = (id: string) => makePhoto({ id: `p-${id}`, targetId: id, takenAt: '2026-11-23' });

describe('buildAgenda (T05 AC1)', () => {
  it('SR01 xổ nhụy 26/09 (ngày 59): Kali đang diễn ra, Lên cơm từ 25/11, Giảm đạm 27/11', () => {
    const s = st({ trees: [makeTree({ id: 'SR01', flowerDate: '2026-09-26' })], photos: [photoOk('SR01')] });
    expect(byKey(s, 'ri6-kali:SR01')).toMatchObject({ ongoing: true, dueDate: '2026-11-30' });
    expect(byKey(s, 'ri6-len-com:SR01')).toMatchObject({ dueDate: '2026-11-25' });
    expect(byKey(s, 'ri6-giam-dam:SR01')).toMatchObject({ dueDate: '2026-11-27' });
    expect(keys(s).filter((k) => k.startsWith('ri6-'))).toHaveLength(3); // tưới nhấp, chặn đọt đã qua; thu hoạch còn xa
  });

  it('SR02 ảnh tuần 16/11 → photo:SR02, ưu tiên cao', () => {
    const s = st({ trees: [makeTree({ id: 'SR02' })], photos: [makePhoto({ id: 'p', targetId: 'SR02', takenAt: '2026-11-16' })] });
    expect(byKey(s, 'photo:SR02')).toMatchObject({ priority: 'cao' });
  });

  it('Phun SR03 ngày 20/11 → recheck7 hạn 27/11; KHÔNG có recheck14 (04/12 ngoài 7 ngày)', () => {
    const spray = makeLog({ id: 'sp', targetId: 'SR03', date: '2026-11-20', type: 'phun-thuoc', activeIngredient: 'Emamectin benzoate', phiDays: 21 });
    const s = st({ trees: [makeTree({ id: 'SR03' })], photos: [photoOk('SR03')], logs: [spray] });
    expect(byKey(s, 'recheck7:sp')).toMatchObject({ dueDate: '2026-11-27' });
    expect(byKey(s, 'recheck14:sp')).toBeUndefined();
    expect(byKey(s, 'phi:sp')).toMatchObject({ reason: 'Không thu hoạch trước 11/12/2026', priority: 'thap' });
  });

  it('Bón vôi LOT_A 20/11 → lime-gap với đúng câu nhắc', () => {
    const s = st({ logs: [makeLog({ id: 'lime', targetId: 'LOT_A', date: '2026-11-20', type: 'bon-phan', fertilizerKind: 'voi-dolomite' })] });
    expect(byKey(s, 'lime-gap:lime')?.reason).toBe('Không bón Hữu cơ/Trichoderma trước 05/12/2026; không bón Urê/Lân trước 30/11/2026');
  });

  it('mùa vụ: 03/05 → bón vôi đầu mùa mưa; 10/10 → cuối mùa mưa; 24/11 → đầu mùa khô', () => {
    expect(keys(st({}), '2026-05-03')).toContain('season:voi-dau-mua-mua:2026');
    expect(keys(st({}), '2026-10-10')).toContain('season:voi-cuoi-mua-mua:2026');
    expect(keys(st({}))).toContain('season:dau-mua-kho:2026');
  });

  it('task done = true hoặc snoozeUntil > hôm nay → không hiện', () => {
    const base = st({ trees: [makeTree({ id: 'SR02' })] });
    expect(keys(base)).toContain('photo:SR02');
    const item = byKey(base, 'photo:SR02')!;
    const ctx = { deviceId: 'd', now: '2026-11-24T01:00:00.000Z', today: TODAY };
    expect(keys({ ...base, tasks: [markDone(item, undefined, ctx)] })).not.toContain('photo:SR02');
    expect(keys({ ...base, tasks: [snooze(item, undefined, ctx)] })).not.toContain('photo:SR02');
    expect(keys({ ...base, tasks: [snooze(item, undefined, ctx)] }, '2026-11-25')).toContain('photo:SR02'); // hết hoãn
  });

  describe('[1.1] pH đất', () => {
    const tree = makeTree({ id: 'SR04' });
    const ph = (date: string, v: number, target = 'SR04', id = `ph-${date}`) => makeLog({ id, targetId: target, date, type: 'do-ph', soilPh: v });
    const lime = (date: string) => makeLog({ id: `lime-${date}`, targetId: 'SR04', date, type: 'bon-phan', fertilizerKind: 'voi-dolomite' });
    it('pH 5,1 (10/11), chưa bón vôi → ph-low:SR04 ưu tiên cao', () =>
      expect(byKey(st({ trees: [tree], logs: [ph('2026-11-10', 5.1)] }), 'ph-low:SR04')).toMatchObject({ priority: 'cao' }));
    it('có vôi 15/11 hoặc cùng ngày 10/11 → hết nhắc; vôi 05/11 (trước khi đo) → vẫn nhắc', () => {
      expect(keys(st({ trees: [tree], logs: [ph('2026-11-10', 5.1), lime('2026-11-15')] }))).not.toContain('ph-low:SR04');
      expect(keys(st({ trees: [tree], logs: [ph('2026-11-10', 5.1), lime('2026-11-10')] }))).not.toContain('ph-low:SR04');
      expect(keys(st({ trees: [tree], logs: [ph('2026-11-10', 5.1), lime('2026-11-05')] }))).toContain('ph-low:SR04');
    });
    it('chỉ xét lần đo gần nhất: 5,0 (01/10) rồi 5,9 (01/11) → không nhắc', () =>
      expect(keys(st({ trees: [makeTree({ id: 'SR05' })], logs: [ph('2026-10-01', 5.0, 'SR05'), ph('2026-11-01', 5.9, 'SR05')] }))).not.toContain('ph-low:SR05'));
    it('LOT_A pH 6,9 → ph-high:LOT_A ưu tiên vừa', () =>
      expect(byKey(st({ logs: [ph('2026-11-10', 6.9, 'LOT_A')] }), 'ph-high:LOT_A')).toMatchObject({ priority: 'vua' }));
  });

  it('[1.1] tải trái: 48 > 40 → fruit-over; chưa đặt giới hạn → không', () => {
    expect(keys(st({ trees: [makeTree({ id: 'SR06', fruitCount: 48, fruitLimit: 40 })] }))).toContain('fruit-over:SR06');
    expect(keys(st({ trees: [makeTree({ id: 'SR06', fruitCount: 48 })] }))).not.toContain('fruit-over:SR06');
  });

  it('[1.1] 1 đợt phun 15 cây ngày 20/11 → đúng 1 việc recheck7:batch "(15 cây)"', () => {
    const trees = Array.from({ length: 15 }, (_, i) => makeTree({ id: `SR${String(i + 1).padStart(2, '0')}` }));
    const logs = trees.map((t) => makeLog({ id: `b-${t.id}`, targetId: t.id, date: '2026-11-20', type: 'phun-thuoc', activeIngredient: 'Abamectin', phiDays: 7, batchId: 'B1' }));
    const items = buildAgenda(st({ trees, logs, photos: trees.map((t) => photoOk(t.id)) }), TODAY);
    const rechecks = items.filter((i) => i.category === 'recheck');
    expect(rechecks).toHaveLength(1);
    expect(rechecks[0]).toMatchObject({ key: 'recheck7:batch:B1', count: 15 });
    expect(rechecks[0].title).toContain('(15 cây)');
    expect(items.filter((i) => i.category === 'phi')).toHaveLength(1);
  });

  it('cây đã xóa không sinh việc; việc tự thêm hiện, xong thì ẩn', () => {
    const t = newTask({ title: 'Mua thêm vôi', dueDate: '2026-11-26', source: 'manual' }, { deviceId: 'd', now: 'n', newId: seqIds('t') });
    const s = st({ trees: [makeTree({ id: 'SR09', deletedAt: 'x' })], tasks: [t] });
    expect(keys(s)).toEqual(expect.arrayContaining(['task:t-1']));
    expect(keys(s).some((k) => k.includes('SR09'))).toBe(false);
    expect(keys({ ...s, tasks: [{ ...t, done: true }] })).not.toContain('task:t-1');
  });

  it('groupAgenda + summarizeAgenda (khối "Hôm nay cần làm" gom ảnh tuần)', () => {
    const trees = ['SR01', 'SR02', 'SR07'].map((id) => makeTree({ id, flowerDate: id === 'SR01' ? '2026-09-26' : undefined }));
    const s = st({ trees, photos: [makePhoto({ id: 'x', targetId: 'SR02', takenAt: '2026-11-10' })] });
    const items = buildAgenda(s, TODAY);
    const g = groupAgenda(items, TODAY);
    expect(g.overdue.map((i) => i.key)).toContain('photo:SR02');
    expect(g.today.map((i) => i.key)).toEqual(expect.arrayContaining(['ri6-kali:SR01', 'photo:SR01']));
    expect(g.upcoming.map((i) => i.key)).toContain('ri6-len-com:SR01');
    const top = summarizeAgenda(items, s);
    expect(top[0]).toMatchObject({ key: 'photo:summary', title: 'Chụp ảnh tuần · 3 cây', priority: 'cao' });
    expect(top.length).toBeLessThanOrEqual(5);
  });
});

describe('shouldNotify (T05 AC5) — giờ VN = UTC+7', () => {
  const base = { lastKeys: ['a'], keys: ['a', 'b'] };
  it('22:00 hoặc 05:59 → false (giờ yên lặng)', () => {
    expect(shouldNotify({ ...base, now: '2026-11-24T15:00:00.000Z' })).toMatchObject({ notify: false, reason: 'quiet-hours' });
    expect(shouldNotify({ ...base, now: '2026-11-24T22:59:00.000Z' })).toMatchObject({ notify: false, reason: 'quiet-hours' });
  });
  it('07:00, lần trước 07:00 hôm qua, có key mới → true', () =>
    expect(shouldNotify({ ...base, now: '2026-11-25T00:00:00.000Z', lastNotifiedAt: '2026-11-24T00:00:00.000Z' })).toMatchObject({ notify: true, newKeys: ['b'] }));
  it('đã báo trong cùng ngày → false', () =>
    expect(shouldNotify({ ...base, now: '2026-11-25T09:00:00.000Z', lastNotifiedAt: '2026-11-25T00:30:00.000Z' })).toMatchObject({ notify: false, reason: 'already-today' }));
  it('không có key mới → false', () =>
    expect(shouldNotify({ lastKeys: ['a', 'b'], keys: ['b', 'a'], now: '2026-11-25T00:00:00.000Z' })).toMatchObject({ notify: false, reason: 'nothing-new' }));
  it('nội dung thông báo tổng hợp', () => {
    const n = buildAgendaNotification(buildAgenda(st({ trees: [makeTree({ id: 'SR02' })] }), TODAY));
    expect(n.title).toMatch(/Hôm nay có \d+ việc/);
    expect(n.url).toBe('./#/agenda');
  });
});

describe('calendarUrl (T05 AC4)', () => {
  it('"Thu hoạch SR01" cả ngày 25/04 → 10/05/2027 → dates=20270425/20270511 (kết thúc +1)', () => {
    const u = calendarUrl({ title: 'Thu hoạch SR01', start: '2027-04-25', end: '2027-05-10' });
    expect(u).toContain('dates=20270425/20270511');
    expect(decodeURIComponent(u)).toContain('text=Thu hoạch SR01');
    expect(u).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  });
  it('tiếng Việt được mã hóa URL (không có ký tự có dấu thô trong link)', () => {
    const u = calendarUrl({ title: 'Bón vôi đầu mùa mưa', start: '2026-05-01', details: 'Lô A – Đồng Nai' });
    expect(u).not.toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ ]/i);
    expect(decodeURIComponent(u)).toContain('Lô A – Đồng Nai');
  });
  it('nhắc chụp ảnh hằng tuần có recur=RRULE:FREQ=WEEKLY; link của việc cần làm', () => {
    expect(decodeURIComponent(weeklyPhotoReminderUrl('2026-11-24'))).toContain('recur=RRULE:FREQ=WEEKLY');
    const item = buildAgenda(st({ trees: [makeTree({ id: 'SR02' })] }), TODAY).find((i) => i.key === 'photo:SR02')!;
    expect(agendaItemCalendarUrl(item)).toContain('dates=20261124/20261125');
  });
});
