import type { ISODate, ISOTime, Log, Task } from '../../types/models';
import { LIME_GAP_DAYS, RECHECK_AFTER_DAYS, SOIL_PH } from '../agronomy';
import { addDays, diffDays, formatDateVN } from '../date';
import type { SyncState } from '../merge';
import { phiEnd, phiWarning } from '../phi';
import { lastWeeklyByTarget, photoStatus } from '../photoStatus';
import { ri6Milestones, type Milestone } from '../ri6';

export type AgendaPriority = 'cao' | 'vua' | 'thap';
export type AgendaCategory = 'photo' | 'ri6' | 'phi' | 'recheck' | 'lime-gap' | 'season' | 'ph' | 'fruit' | 'task';

export interface AgendaItem {
  /** Khóa ổn định — dùng làm `Task.id` khi bấm Xong/Hoãn (đồng bộ giữa các máy). */
  key: string;
  category: AgendaCategory;
  title: string;
  reason: string;
  targetId?: string;
  /** Số đối tượng (việc gom theo đợt). */
  count?: number;
  dueDate: ISODate;
  priority: AgendaPriority;
  source: Task['source'];
  /** Đang diễn ra (ví dụ "Chuyển Kali" ngày 55–65): hiện ở nhóm "Hôm nay", không tính quá hạn. */
  ongoing?: boolean;
}

export const AGENDA_HORIZON_DAYS = 7;
/** Việc "kiểm tra lại" quá hạn quá số ngày này thì thôi nhắc (tránh tồn đọng mãi). */
export const RECHECK_STALE_DAYS = 14;

const PRIORITY_RANK: Record<AgendaPriority, number> = { cao: 0, vua: 1, thap: 2 };
const ph = (v: number) => String(v).replace('.', ',');

function labelOf(state: SyncState, targetId: string): string {
  if (targetId === 'LOT_A') return 'Lô A';
  const t = state.trees.find((x) => x.id === targetId);
  return t ? t.code : targetId;
}

/** Gom log theo đợt (`batchId`); log lẻ là nhóm 1 phần tử. */
function groupByBatch(logs: Log[]): Log[][] {
  const map = new Map<string, Log[]>();
  for (const l of logs) {
    const k = l.batchId ? `b:${l.batchId}` : `l:${l.id}`;
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  return [...map.values()];
}
const groupKey = (prefix: string, g: Log[]) => (g[0].batchId && g.length > 1 ? `${prefix}:batch:${g[0].batchId}` : `${prefix}:${g[0].id}`);
const groupTarget = (state: SyncState, g: Log[]) => (g.length > 1 ? `${g.length} cây` : labelOf(state, g[0].targetId));

/**
 * Mốc Ri6 → việc nếu đang diễn ra hoặc bắt đầu trong tầm nhìn.
 * Cửa sổ: `until` = [xổ nhụy, latest]; `range` = [earliest, latest]; `from` = [earliest, hết mùa thu hoạch].
 */
function milestoneItem(m: Milestone, treeId: string, code: string, today: ISODate, horizon: ISODate, harvestEnd: ISODate): AgendaItem | null {
  const start = m.kind === 'until' ? addDays(m.earliest, -m.days[0]) : m.earliest;
  const end = m.kind === 'from' ? harvestEnd : m.latest;
  if (start > horizon || today > end) return null;
  const ongoing = start <= today && m.kind !== 'from';
  const dueDate = m.kind === 'from' ? m.earliest : ongoing ? end : start;
  const priority: AgendaPriority = m.key === 'thu-hoach' || m.key === 'tuoi-nhap' || m.key === 'chan-dot' ? 'cao' : 'vua';
  const when = m.kind === 'from' ? `từ ${formatDateVN(m.earliest)}` : ongoing ? `đến ${formatDateVN(end)}` : `bắt đầu ${formatDateVN(start)}`;
  return { key: `ri6-${m.key}:${treeId}`, category: 'ri6', title: `${code} · ${m.label}`, reason: `${m.note} — ${when}`, targetId: treeId, dueDate, priority, source: 'rule', ...(ongoing && { ongoing }) };
}

/**
 * Danh sách việc cần làm (SPEC M6 + [1.1], T05 AC1). Chạy offline, không phụ thuộc AI.
 * Gồm mọi việc quá hạn + việc trong `AGENDA_HORIZON_DAYS` ngày tới; bỏ việc đã Xong / đang Hoãn.
 */
export function buildAgenda(state: SyncState, today: ISODate, horizonDays = AGENDA_HORIZON_DAYS): AgendaItem[] {
  const horizon = addDays(today, horizonDays);
  const items: AgendaItem[] = [];
  const trees = state.trees.filter((t) => !t.deletedAt);
  const liveTargets = new Set([...trees.map((t) => t.id), 'LOT_A']);
  const logs = state.logs.filter((l) => !l.deletedAt && liveTargets.has(l.targetId));

  // 1) Ảnh tuần
  const lastWeekly = lastWeeklyByTarget(state.photos);
  for (const t of trees) {
    const last = lastWeekly.get(t.id);
    const st = photoStatus(last, today);
    if (st === 'ok') continue;
    items.push({
      key: `photo:${t.id}`,
      category: 'photo',
      title: `${t.code} · Chụp ảnh tuần`,
      reason: last ? `Ảnh gần nhất ${formatDateVN(last)} (${diffDays(last, today)} ngày trước)` : 'Chưa có ảnh gốc',
      targetId: t.id,
      dueDate: last ? addDays(last, 7) : today,
      priority: st === 'overdue' ? 'cao' : 'vua',
      source: 'rule',
    });
  }

  // 2) Mốc Ri6 + 8) tải trái
  for (const t of trees) {
    const base = t.flowerDate ? { kind: 'xo-nhuy' as const, date: t.flowerDate } : t.budDate ? { kind: 'mat-cua' as const, date: t.budDate } : null;
    if (base) {
      const ms = ri6Milestones(base);
      const harvestEnd = ms.find((m) => m.key === 'thu-hoach')!.latest;
      for (const m of ms) {
        if (m.key === 'xo-nhuy') continue;
        const it = milestoneItem(m, t.id, t.code, today, horizon, harvestEnd);
        if (it) items.push(it);
      }
    }
    if (t.fruitLimit !== undefined && t.fruitCount !== undefined && t.fruitCount > t.fruitLimit) {
      items.push({ key: `fruit-over:${t.id}`, category: 'fruit', title: `${t.code} · Tỉa bớt trái`, reason: `Đang mang ${t.fruitCount} trái, vượt mức ${t.fruitLimit} đã đặt`, targetId: t.id, dueDate: today, priority: 'vua', source: 'rule' });
    }
  }

  // 3) PHI — đang trong thời gian cách ly (gom theo đợt)
  const sprays = logs.filter((l) => l.type === 'phun-thuoc' && l.phiDays !== undefined && (phiEnd(l) ?? '') >= today);
  for (const g of groupByBatch(sprays)) {
    const end = g.map((l) => phiEnd(l)!).sort().at(-1)!;
    const risky = g.some((l) => {
      const t = trees.find((x) => x.id === l.targetId);
      return t?.flowerDate ? phiWarning(t.flowerDate, [l], t.id) !== null : false;
    });
    items.push({
      key: groupKey('phi', g),
      category: 'phi',
      title: `${groupTarget(state, g)} · Đang cách ly thuốc${g[0].activeIngredient ? ` (${g[0].activeIngredient})` : ''}`,
      reason: `Không thu hoạch trước ${formatDateVN(end)}`,
      targetId: g.length === 1 ? g[0].targetId : undefined,
      count: g.length,
      dueDate: end,
      priority: risky ? 'cao' : 'thap',
      source: 'rule',
      ongoing: true,
    });
  }

  // 4) Kiểm tra lại sau phun / sâu bệnh (+7, +14), gom theo đợt
  const checks = logs.filter((l) => l.type === 'phun-thuoc' || l.type === 'sau-benh');
  for (const g of groupByBatch(checks)) {
    for (const d of RECHECK_AFTER_DAYS) {
      const due = addDays(g[0].date, d);
      if (due > horizon || diffDays(due, today) > RECHECK_STALE_DAYS) continue;
      items.push({
        key: groupKey(`recheck${d}`, g),
        category: 'recheck',
        title: `Kiểm tra lại sau ${g[0].type === 'phun-thuoc' ? 'phun' : 'xử lý sâu bệnh'} (${groupTarget(state, g)})`,
        reason: `Đợt ${formatDateVN(g[0].date)} · mốc ${d} ngày`,
        targetId: g.length === 1 ? g[0].targetId : undefined,
        count: g.length,
        dueDate: due,
        priority: 'vua',
        source: 'rule',
      });
    }
  }

  // 5) Khoảng cách sau bón vôi
  const limes = logs.filter((l) => l.type === 'bon-phan' && l.fertilizerKind === 'voi-dolomite' && today < addDays(l.date, LIME_GAP_DAYS.organic));
  for (const g of groupByBatch(limes)) {
    const organic = addDays(g[0].date, LIME_GAP_DAYS.organic);
    const np = addDays(g[0].date, LIME_GAP_DAYS.nitrogenPhosphate);
    items.push({
      key: groupKey('lime-gap', g),
      category: 'lime-gap',
      title: `${groupTarget(state, g)} · Vừa bón vôi — chờ trước khi bón phân khác`,
      reason: `Không bón Hữu cơ/Trichoderma trước ${formatDateVN(organic)}; không bón Urê/Lân trước ${formatDateVN(np)}`,
      targetId: g.length === 1 ? g[0].targetId : undefined,
      count: g.length,
      dueDate: organic,
      priority: 'vua',
      source: 'rule',
      ongoing: true,
    });
  }

  // 6) Mùa vụ
  const [y, mo] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const monthEnd = addDays(`${mo === 12 ? y + 1 : y}-${String((mo % 12) + 1).padStart(2, '0')}-01`, -1);
  const season: Record<number, [string, string, string]> = {
    5: ['voi-dau-mua-mua', 'Bón vôi đầu mùa mưa', `Giữ pH ${ph(SOIL_PH.min)}–${ph(SOIL_PH.max)}; bón hữu cơ/Trichoderma sau ít nhất ${LIME_GAP_DAYS.organic} ngày`],
    10: ['voi-cuoi-mua-mua', 'Bón vôi cuối mùa mưa', `Giữ pH ${ph(SOIL_PH.min)}–${ph(SOIL_PH.max)}; cách phân đạm/lân ít nhất ${LIME_GAP_DAYS.nitrogenPhosphate} ngày`],
    11: ['dau-mua-kho', 'Kiểm tra béc, soi nhện đỏ đầu mùa khô', 'Đầu mùa khô: kiểm tra béc không phun vào thân, soi mặt dưới lá già'],
  };
  if (season[mo]) {
    const [code, title, reason] = season[mo];
    items.push({ key: `season:${code}:${y}`, category: 'season', title, reason, dueDate: monthEnd, priority: 'vua', source: 'rule', ongoing: true });
  }

  // 7) pH đất — xét lần đo gần nhất của từng đối tượng
  const phLogs = logs.filter((l) => l.type === 'do-ph' && l.soilPh !== undefined).sort((a, b) => (a.date === b.date ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.date < b.date ? 1 : -1));
  const seenPh = new Set<string>();
  for (const l of phLogs) {
    if (seenPh.has(l.targetId)) continue;
    seenPh.add(l.targetId);
    const name = labelOf(state, l.targetId);
    if (l.soilPh! < SOIL_PH.min) {
      const limedAfter = logs.some((x) => x.targetId === l.targetId && x.type === 'bon-phan' && x.fertilizerKind === 'voi-dolomite' && x.date >= l.date);
      if (!limedAfter) {
        items.push({ key: `ph-low:${l.targetId}`, category: 'ph', title: `${name} · Cải tạo pH đất`, reason: `pH ${ph(l.soilPh!)} (đo ${formatDateVN(l.date)}) thấp hơn ${ph(SOIL_PH.min)}: bón vôi/Dolomite, nhớ khoảng cách với phân khác`, targetId: l.targetId, dueDate: today, priority: 'cao', source: 'rule' });
      }
    } else if (l.soilPh! > SOIL_PH.max) {
      items.push({ key: `ph-high:${l.targetId}`, category: 'ph', title: `${name} · pH vượt ${ph(SOIL_PH.max)}`, reason: `pH ${ph(l.soilPh!)} (đo ${formatDateVN(l.date)}): tạm ngưng vôi/Dolomite`, targetId: l.targetId, dueDate: today, priority: 'vua', source: 'rule' });
    }
  }

  // 9) Việc tự thêm / AI gợi ý
  for (const t of state.tasks) {
    if (t.deletedAt || t.done || t.source === 'rule' || !t.title) continue;
    items.push({ key: `task:${t.id}`, category: 'task', title: t.title, reason: t.source === 'ai' ? 'Gợi ý từ trợ lý AI' : 'Việc tự thêm', targetId: t.targetId, dueDate: t.dueDate ?? today, priority: 'vua', source: t.source });
  }

  // Lọc: trong tầm nhìn, chưa Xong, không đang Hoãn
  const taskById = new Map(state.tasks.filter((t) => !t.deletedAt).map((t) => [t.id, t]));
  const visible = items.filter((it) => {
    const id = it.category === 'task' ? it.key.slice(5) : it.key;
    const tk = taskById.get(id);
    if (tk?.done) return false;
    if (tk?.snoozeUntil && tk.snoozeUntil > today) return false;
    return it.dueDate <= horizon || it.ongoing === true;
  });
  return visible.sort((a, b) => {
    const ao = a.dueDate < today && !a.ongoing ? 0 : 1;
    const bo = b.dueDate < today && !b.ongoing ? 0 : 1;
    return ao - bo || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0) || (a.key < b.key ? -1 : 1);
  });
}

/** Chia nhóm cho màn Việc cần làm: Quá hạn / Hôm nay / 7 ngày tới. */
export function groupAgenda(items: readonly AgendaItem[], today: ISODate) {
  return {
    overdue: items.filter((i) => i.dueDate < today && !i.ongoing),
    today: items.filter((i) => i.dueDate === today || (i.ongoing === true && i.dueDate !== today)),
    upcoming: items.filter((i) => i.dueDate > today && !i.ongoing),
  };
}

/**
 * Khối "Hôm nay cần làm" (tối đa `limit`): gom các việc ảnh tuần thành 1 dòng
 * "Chụp ảnh tuần · N cây" như mockup.
 */
export function summarizeAgenda(items: readonly AgendaItem[], state: SyncState, limit = 5): AgendaItem[] {
  const photos = items.filter((i) => i.category === 'photo');
  const rest = items.filter((i) => i.category !== 'photo');
  const out: AgendaItem[] = [];
  if (photos.length > 0) {
    const codes = photos.map((p) => labelOf(state, p.targetId!));
    out.push({
      key: 'photo:summary',
      category: 'photo',
      title: `Chụp ảnh tuần · ${photos.length} cây`,
      reason: `${codes.slice(0, 4).join(', ')}${codes.length > 4 ? '…' : ''}${photos.some((p) => p.priority === 'cao') ? ' · quá hạn' : ''}`,
      count: photos.length,
      dueDate: photos.map((p) => p.dueDate).sort()[0],
      priority: photos.some((p) => p.priority === 'cao') ? 'cao' : 'vua',
      source: 'rule',
    });
  }
  return [...out, ...rest].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, limit);
}

/** Bấm "Xong": bản ghi `tasks` (id = key với việc theo quy tắc) — đồng bộ để máy khác không nhắc lại. */
export function markDone(item: AgendaItem, existing: Task | undefined, ctx: { deviceId: string; now: ISOTime }): Task {
  const id = item.category === 'task' ? item.key.slice(5) : item.key;
  return { ...(existing ?? { id, source: item.source, title: item.title, targetId: item.targetId, dueDate: item.dueDate }), id, done: true, updatedAt: ctx.now, updatedBy: ctx.deviceId };
}

/** Bấm "Hoãn 1 ngày". */
export function snooze(item: AgendaItem, existing: Task | undefined, ctx: { deviceId: string; now: ISOTime; today: ISODate }, days = 1): Task {
  const id = item.category === 'task' ? item.key.slice(5) : item.key;
  return { ...(existing ?? { id, source: item.source, title: item.title, targetId: item.targetId, dueDate: item.dueDate, done: false }), id, snoozeUntil: addDays(ctx.today, days), updatedAt: ctx.now, updatedBy: ctx.deviceId };
}

/** Tạo việc tự thêm hoặc từ AI. */
export function newTask(input: { title: string; dueDate: ISODate; targetId?: string; source: 'manual' | 'ai' }, ctx: { deviceId: string; now: ISOTime; newId: () => string }): Task {
  return { id: ctx.newId(), title: input.title.trim(), dueDate: input.dueDate, targetId: input.targetId, done: false, source: input.source, updatedAt: ctx.now, updatedBy: ctx.deviceId };
}
