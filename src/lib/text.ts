/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm: bỏ dấu, đ→d, chữ thường, gộp khoảng trắng.
 * "Góc Giếng" → "goc gieng".
 */
export function normalizeVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
