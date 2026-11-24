import type { FertKind, ISODate, Log, LogType } from '../types/models';
import { LIME_GAP_DAYS, SOIL_PH } from './agronomy';
import { addDays } from './date';

/** Dữ liệu người dùng nhập cho một mục nhật ký (chưa có SyncMeta). */
export interface LogInput {
  type: LogType;
  date: ISODate;
  note?: string;
  activeIngredient?: string;
  phiDays?: number;
  fertilizerKind?: FertKind;
  soilPh?: number;
}

export type LogFieldErrors = Partial<Record<'date' | 'activeIngredient' | 'phiDays' | 'fertilizerKind' | 'soilPh', string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Kiểm tra ràng buộc bắt buộc (SPEC M2):
 * - Phun thuốc: hoạt chất + PHI (số nguyên 0–365).
 * - Bón phân: loại phân.
 * - Đo pH: `soilPh` 3,0–9,0.
 * Trả về object rỗng nếu hợp lệ. Thông báo lỗi bằng tiếng Việt để hiện ngay dưới ô nhập.
 */
export function validateLog(input: LogInput): LogFieldErrors {
  const e: LogFieldErrors = {};
  if (!DATE_RE.test(input.date)) e.date = 'Chọn ngày';
  if (input.type === 'phun-thuoc') {
    if (!input.activeIngredient?.trim()) e.activeIngredient = 'Nhập hoạt chất (theo nhãn thuốc)';
    const phi = input.phiDays;
    if (phi === undefined || !Number.isInteger(phi) || phi < 0 || phi > 365) e.phiDays = 'Nhập số ngày cách ly (PHI) từ 0 đến 365';
  }
  if (input.type === 'bon-phan' && !input.fertilizerKind) e.fertilizerKind = 'Chọn loại phân';
  if (input.type === 'do-ph') {
    const ph = input.soilPh;
    if (ph === undefined || !Number.isFinite(ph) || ph < SOIL_PH.inputMin || ph > SOIL_PH.inputMax) {
      e.soilPh = 'pH phải từ 3,0 đến 9,0';
    }
  }
  return e;
}

export function isValidLog(input: LogInput): boolean {
  return Object.keys(validateLog(input)).length === 0;
}

const isLime = (l: Log) => !l.deletedAt && l.type === 'bon-phan' && l.fertilizerKind === 'voi-dolomite';

/** Số ngày phải chờ sau khi bón vôi trước khi bón loại phân này (null nếu không ràng buộc). */
export function limeGapFor(kind: FertKind | undefined): number | null {
  if (kind === 'huu-co-trichoderma') return LIME_GAP_DAYS.organic;
  if (kind === 'dam-ure' || kind === 'lan') return LIME_GAP_DAYS.nitrogenPhosphate;
  return null;
}

export interface LimeGapViolation {
  targetId: string;
  limeLogId: string;
  limeDate: ISODate;
  /** Ngày sớm nhất được bón loại phân này. */
  notBefore: ISODate;
  gapDays: number;
}

/**
 * Kiểm tra khoảng cách bón vôi (SPEC §3.3, M6) cho một lần bón phân sắp lưu.
 * Vi phạm khi có log vôi/Dolomite cùng đối tượng, ngày ≤ ngày bón, và ngày bón < ngày vôi + khoảng cách.
 * Chỉ cảnh báo — UI vẫn cho lưu.
 */
export function limeGapViolations(
  existingLogs: readonly Log[],
  targetIds: readonly string[],
  date: ISODate,
  kind: FertKind | undefined,
): LimeGapViolation[] {
  const gap = limeGapFor(kind);
  if (gap === null) return [];
  const out: LimeGapViolation[] = [];
  for (const targetId of targetIds) {
    // Lấy lần bón vôi gần nhất (≤ ngày bón) của đối tượng.
    const lime = existingLogs
      .filter((l) => isLime(l) && l.targetId === targetId && l.date <= date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!lime) continue;
    const notBefore = addDays(lime.date, gap);
    if (date < notBefore) out.push({ targetId, limeLogId: lime.id, limeDate: lime.date, notBefore, gapDays: gap });
  }
  return out;
}
