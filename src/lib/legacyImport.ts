import type { ISOTime, Log, LogType, Stage, Tree } from '../types/models';
import { emptySyncState, type SyncState } from './merge';

/** Định dạng file sao lưu của app cũ `legacy/index.html` (key localStorage `sau_rieng_ri6_loc_tan_v1`). */
export interface LegacyLog {
  date: string;
  type: string;
  note: string;
}
export interface LegacyTree {
  id: string;
  name?: string;
  age?: number | string;
  stage?: string;
  status?: 'healthy' | 'pruning' | 'watch' | string;
  logs?: LegacyLog[];
}
export interface LegacyBackup {
  season?: string;
  trees: LegacyTree[];
  youngBatchLogs?: LegacyLog[];
}

export function isLegacyBackup(raw: unknown): raw is LegacyBackup {
  const r = raw as Partial<LegacyBackup> | null;
  return !!r && Array.isArray(r.trees) && !('app' in (r as object)) && r.trees.every((t) => typeof t?.id === 'string');
}

const STAGE_MAP: Record<string, Stage | null> = {
  'Đang đi cơi đọt': 'coi-dot',
  'Lá lụa / Lá già': null,
  'Đang tạo mầm / Ra mắt cua': 'mat-cua',
  'Đang xổ nhụy': 'xo-nhuy',
  'Đang nuôi trái': 'nuoi-trai',
  'Phục hồi sau thu hoạch': 'phuc-hoi',
};

/** Loại nhật ký app cũ → loại mới. Không rõ thì 'khac'; loại gốc luôn giữ trong ghi chú. */
const LOG_TYPE_MAP: Record<string, LogType> = {
  'Bón phân': 'bon-phan',
  'Cơi đọt & Dinh dưỡng': 'bon-phan',
  'Phun thuốc BVTV': 'phun-thuoc',
  'Phun bảo vệ đọt non': 'phun-thuoc',
  'Cắt tỉa nhánh': 'cat-tia',
  'Đánh giá cắt tỉa': 'cat-tia',
  'Tỉa chồi & Tạo tán': 'cat-tia',
  'Sâu bệnh / Triệu chứng': 'sau-benh',
  'Làm bông / Nuôi trái': 'lam-bong',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** FNV-1a 32-bit → hex; đủ để tạo id tất định (nhập lại không nhân đôi). */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function convertLogs(targetId: string, logs: readonly LegacyLog[] | undefined, deviceId: string, now: ISOTime): Log[] {
  const seen = new Map<string, number>();
  const out: Log[] = [];
  for (const l of logs ?? []) {
    if (!l || !DATE_RE.test(l.date)) continue;
    const base = `${targetId}|${l.date}|${l.type}|${l.note}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const type = LOG_TYPE_MAP[l.type] ?? 'khac';
    out.push({
      id: `legacy-${targetId}-${fnv1a(`${base}|${n}`)}`,
      targetId,
      date: l.date,
      type,
      note: `[Từ app cũ: ${l.type}] ${l.note ?? ''}`.trim(),
      // App cũ không có các trường bắt buộc mới → để trống, KHÔNG bịa (loại phân "Khác", PHI chưa rõ).
      ...(type === 'bon-phan' && { fertilizerKind: 'khac' as const }),
      updatedAt: now,
      updatedBy: deviceId,
    });
  }
  return out;
}

/**
 * Chuyển file app cũ → `SyncState` để gộp bằng `mergeState` (SPEC M5 [BS]: chỉ cây + nhật ký).
 * - Cây khớp theo `id` (SR01…SR15): chỉ vá các trường app cũ có; giữ nguyên trường mới của cây hiện có.
 * - Ảnh dataURL của app cũ KHÔNG nhập (quá nặng, không có định dạng mới).
 * - Nhật ký Lô A (`youngBatchLogs`) → `targetId: 'LOT_A'`.
 */
export function convertLegacyBackup(
  legacy: LegacyBackup,
  ctx: { deviceId: string; now: ISOTime; existingTrees: readonly Tree[] },
): SyncState {
  const state = emptySyncState();
  const byId = new Map(ctx.existingTrees.map((t) => [t.id, t]));
  for (const lt of legacy.trees) {
    const base: Tree = byId.get(lt.id) ?? {
      id: lt.id,
      code: lt.id,
      lot: 'B',
      label: lt.id,
      location: '',
      ageYears: null,
      stage: null,
      health: 'tot',
      needsPruning: false,
      diseaseWatch: false,
      updatedAt: ctx.now,
      updatedBy: ctx.deviceId,
    };
    const name = (lt.name ?? '').trim();
    const age = Number(lt.age);
    const tree: Tree = {
      ...base,
      label: name && !/Chưa đặt vị trí$/.test(name) ? name : base.label,
      ageYears: Number.isFinite(age) && age > 0 ? age : base.ageYears,
      stage: lt.stage !== undefined && lt.stage in STAGE_MAP ? STAGE_MAP[lt.stage] : base.stage,
      needsPruning: lt.status === 'pruning' ? true : base.needsPruning,
      diseaseWatch: lt.status === 'watch' ? true : base.diseaseWatch,
      health: lt.status === 'watch' && base.health === 'tot' ? 'theo-doi' : base.health,
      updatedAt: ctx.now,
      updatedBy: ctx.deviceId,
    };
    state.trees.push(tree);
    state.logs.push(...convertLogs(lt.id, lt.logs, ctx.deviceId, ctx.now));
  }
  state.logs.push(...convertLogs('LOT_A', legacy.youngBatchLogs, ctx.deviceId, ctx.now));
  return state;
}
