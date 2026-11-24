import type { Tree } from '../types/models';

const CODE_RE = /^SR(\d+)$/i;

/**
 * Mã cây tiếp theo = số SR lớn nhất + 1, tính CẢ cây đã xóa (không cấp lại mã đã xóa).
 * Mã không theo mẫu `SRnn` bị bỏ qua. Luôn ít nhất 2 chữ số: SR01…SR99, SR100…
 */
export function nextTreeCode(trees: readonly Pick<Tree, 'code'>[]): string {
  let max = 0;
  for (const t of trees) {
    const m = CODE_RE.exec(t.code.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `SR${String(max + 1).padStart(2, '0')}`;
}

/**
 * Các mã đang bị trùng giữa các cây CHƯA xóa (so không phân biệt hoa thường).
 * Trả về map: mã (viết hoa) → danh sách `tree.id`.
 */
export function duplicateCodes(trees: readonly Tree[]): Map<string, string[]> {
  const byCode = new Map<string, string[]>();
  for (const t of trees) {
    if (t.deletedAt) continue;
    const key = t.code.trim().toUpperCase();
    byCode.set(key, [...(byCode.get(key) ?? []), t.id]);
  }
  for (const [k, ids] of byCode) if (ids.length < 2) byCode.delete(k);
  return byCode;
}
