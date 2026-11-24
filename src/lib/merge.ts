import type { Log, Lot, Photo, SyncMeta, Task, Tree } from '../types/models';

/** Dữ liệu đồng bộ được (SPEC §6) — không có Settings, không có blob ảnh. */
export interface SyncState {
  trees: Tree[];
  lots: Lot[];
  logs: Log[];
  tasks: Task[];
  photos: Photo[];
}

export const SYNC_COLLECTIONS = ['trees', 'lots', 'logs', 'tasks', 'photos'] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export function emptySyncState(): SyncState {
  return { trees: [], lots: [], logs: [], tasks: [], photos: [] };
}

/**
 * Chọn bản thắng giữa hai phiên bản của CÙNG một bản ghi (SPEC §6 bước 3):
 * `updatedAt` mới hơn thắng; bằng nhau thì `updatedBy` lớn hơn (so chuỗi) thắng.
 * Tombstone (`deletedAt`) là bản ghi bình thường, cùng quy tắc.
 * Hoàn toàn bằng nhau về khóa thì giữ `a` — chọn tất định để merge giao hoán.
 */
export function pickWinner<T extends SyncMeta>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  if (a.updatedBy !== b.updatedBy) return a.updatedBy > b.updatedBy ? a : b;
  // Cùng thời điểm, cùng máy: so nội dung để tất định.
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

/** Hợp theo `id`, kết quả sắp xếp theo `id` (diff ổn định). Lũy đẳng và giao hoán. */
export function mergeById<T extends SyncMeta>(a: readonly T[], b: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const r of [...a, ...b]) {
    const cur = map.get(r.id);
    map.set(r.id, cur ? pickWinner(cur, r) : r);
  }
  return [...map.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

export function mergeState(a: SyncState, b: SyncState): SyncState {
  return {
    trees: mergeById(a.trees, b.trees),
    lots: mergeById(a.lots, b.lots),
    logs: mergeById(a.logs, b.logs),
    tasks: mergeById(a.tasks, b.tasks),
    photos: mergeById(a.photos, b.photos),
  };
}

export interface MergeCounts {
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Đếm thay đổi nếu gộp `incoming` vào `local` — dùng cho bước xem trước khi nhập JSON
 * và để biết có cần ghi lên repo hay không.
 */
export function diffCounts(local: SyncState, incoming: SyncState): Record<SyncCollection, MergeCounts> {
  const out = {} as Record<SyncCollection, MergeCounts>;
  for (const key of SYNC_COLLECTIONS) {
    const localMap = new Map<string, SyncMeta>((local[key] as SyncMeta[]).map((r) => [r.id, r]));
    const c: MergeCounts = { added: 0, updated: 0, unchanged: 0 };
    for (const r of incoming[key] as SyncMeta[]) {
      const cur = localMap.get(r.id);
      if (!cur) c.added += 1;
      else if (pickWinner(cur, r) !== cur && stableStringify(cur) !== stableStringify(r)) c.updated += 1;
      else c.unchanged += 1;
    }
    out[key] = c;
  }
  return out;
}

export function hasChanges(counts: Record<SyncCollection, MergeCounts>): boolean {
  return SYNC_COLLECTIONS.some((k) => counts[k].added + counts[k].updated > 0);
}

/** JSON với khóa sắp xếp — so sánh nội dung tất định. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1)))
      : v,
  );
}
