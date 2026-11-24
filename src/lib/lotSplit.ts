import type { ISODate, ISOTime, Log, Lot, Tree } from '../types/models';
import { nextTreeCode } from './treeCodes';

export interface SplitContext {
  deviceId: string;
  now: ISOTime;
  today: ISODate;
  newId: () => string;
}

export type SplitResult =
  | { ok: true; lot: Lot; newTrees: Tree[]; log: Log }
  | { ok: false; error: string };

/**
 * Tách `count` cây khỏi Lô A sang theo dõi cá thể (SPEC M2 [1.1]).
 * - Cây mới: `id` UUID, `lot: 'A'`, mã gợi ý tiếp theo (SRnn), hồ sơ trống.
 * - Giảm `lot.treeCount`; ghi 1 nhật ký "Khác" cho LOT_A để lưu vết.
 * - Không cho tách ≤ 0 hoặc vượt `treeCount`.
 */
export function splitFromLotA(lot: Lot, allTrees: readonly Tree[], count: number, ctx: SplitContext): SplitResult {
  if (!Number.isInteger(count) || count <= 0) return { ok: false, error: 'Số cây cần tách phải là số nguyên dương' };
  if (count > lot.treeCount) return { ok: false, error: `Lô A chỉ còn ${lot.treeCount} cây` };

  const newTrees: Tree[] = [];
  for (let i = 0; i < count; i += 1) {
    const code = nextTreeCode([...allTrees, ...newTrees]);
    newTrees.push({
      id: ctx.newId(),
      code,
      lot: 'A',
      label: code,
      location: '',
      ageYears: null,
      stage: null,
      health: 'tot',
      needsPruning: false,
      diseaseWatch: false,
      updatedAt: ctx.now,
      updatedBy: ctx.deviceId,
    });
  }
  const remaining = lot.treeCount - count;
  const codes = newTrees.map((t) => t.code);
  const log: Log = {
    id: ctx.newId(),
    targetId: lot.id,
    date: ctx.today,
    type: 'khac',
    note: `Tách ${count} cây khỏi Lô A sang theo dõi cá thể: ${codes.join(', ')}. Lô A còn ${remaining} cây.`,
    updatedAt: ctx.now,
    updatedBy: ctx.deviceId,
  };
  return { ok: true, lot: { ...lot, treeCount: remaining, updatedAt: ctx.now, updatedBy: ctx.deviceId }, newTrees, log };
}

/** Tổng số cây = cây cá thể chưa xóa + cây còn quản lý theo Lô A (SPEC §2 [1.1]). */
export function totalTreeCount(trees: readonly Tree[], lotA: Pick<Lot, 'treeCount'> | undefined): number {
  return trees.filter((t) => !t.deletedAt).length + (lotA?.treeCount ?? 0);
}
