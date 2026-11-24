import type { ISODate, Tree } from '../types/models';
import { photoStatus } from './photoStatus';
import { normalizeVi } from './text';

/** Bộ lọc danh sách cây (SPEC M2). */
export type TreeFilter = 'all' | 'need-photo' | 'need-pruning' | 'disease-watch';

export interface TreeFilterContext {
  today: ISODate;
  /** Ngày ảnh tuần gần nhất theo `tree.id` — lấy từ `lastWeeklyByTarget`. */
  lastWeekly: ReadonlyMap<string, ISODate>;
}

export function matchesFilter(tree: Tree, filter: TreeFilter, ctx: TreeFilterContext): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'need-photo':
      return photoStatus(ctx.lastWeekly.get(tree.id), ctx.today) !== 'ok';
    case 'need-pruning':
      return tree.needsPruning;
    case 'disease-watch':
      return tree.diseaseWatch || tree.health === 'benh';
  }
}

/** Tìm theo mã, tên, vị trí — không phân biệt hoa thường và dấu tiếng Việt. */
export function matchesQuery(tree: Tree, query: string): boolean {
  const q = normalizeVi(query);
  if (!q) return true;
  return [tree.code, tree.label, tree.location].some((f) => normalizeVi(f ?? '').includes(q));
}

/** Lọc + tìm + sắp xếp theo mã; bỏ cây đã xóa (tombstone). */
export function filterTrees(
  trees: readonly Tree[],
  opts: { filter: TreeFilter; query?: string },
  ctx: TreeFilterContext,
): Tree[] {
  return trees
    .filter((t) => !t.deletedAt && matchesFilter(t, opts.filter, ctx) && matchesQuery(t, opts.query ?? ''))
    .sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
}
