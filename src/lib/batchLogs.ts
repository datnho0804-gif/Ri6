import type { ISOTime, Log } from '../types/models';
import { limeGapViolations, validateLog, type LimeGapViolation, type LogFieldErrors, type LogInput } from './logRules';

export const LOT_A_TARGET = 'LOT_A';

export interface BatchLogInput extends LogInput {
  /** Các cây cá thể được chọn (theo `tree.id`). */
  treeIds: readonly string[];
  /** "Kèm Lô A" — thêm 1 log cho `LOT_A`. */
  includeLotA?: boolean;
}

export interface BatchContext {
  existingLogs: readonly Log[];
  deviceId: string;
  now: ISOTime;
  /** Sinh UUID — truyền `() => crypto.randomUUID()` từ UI; test truyền hàm cố định. */
  newId: () => string;
}

export type BatchResult =
  | { ok: true; batchId: string; logs: Log[]; limeViolations: LimeGapViolation[] }
  | { ok: false; errors: LogFieldErrors & { targets?: string } };

/**
 * Ghi nhật ký hàng loạt (SPEC M2 [1.1]).
 * - Giữ nguyên ràng buộc của ghi đơn lẻ (`validateLog`).
 * - Tạo **một log cho mỗi đối tượng**, chung `batchId`.
 * - Trả về danh sách cây vi phạm khoảng cách vôi để UI gom vào **một** Modal
 *   ("Vẫn lưu" → lưu `logs`; "Bỏ các cây vi phạm" → `withoutViolations(result)`).
 */
export function createBatchLogs(input: BatchLogInput, ctx: BatchContext): BatchResult {
  const errors: LogFieldErrors & { targets?: string } = { ...validateLog(input) };
  const targets = [...new Set(input.treeIds)];
  if (input.includeLotA) targets.push(LOT_A_TARGET);
  if (targets.length === 0) errors.targets = 'Chọn ít nhất 1 cây';
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const batchId = ctx.newId();
  const logs: Log[] = targets.map((targetId) => ({
    id: ctx.newId(),
    targetId,
    date: input.date,
    type: input.type,
    note: input.note?.trim() ?? '',
    ...(input.type === 'phun-thuoc' && { activeIngredient: input.activeIngredient!.trim(), phiDays: input.phiDays }),
    ...(input.type === 'bon-phan' && { fertilizerKind: input.fertilizerKind }),
    ...(input.type === 'do-ph' && { soilPh: input.soilPh }),
    batchId,
    updatedAt: ctx.now,
    updatedBy: ctx.deviceId,
  }));
  const limeViolations =
    input.type === 'bon-phan' ? limeGapViolations(ctx.existingLogs, targets, input.date, input.fertilizerKind) : [];
  return { ok: true, batchId, logs, limeViolations };
}

/** Bỏ các log của đối tượng vi phạm khoảng cách vôi ("Bỏ các cây vi phạm"). */
export function withoutViolations(result: Extract<BatchResult, { ok: true }>): Log[] {
  const bad = new Set(result.limeViolations.map((v) => v.targetId));
  return result.logs.filter((l) => !bad.has(l.targetId));
}

/** Xóa mềm cả đợt: trả về bản sao các log cùng `batchId` đã gắn `deletedAt`. */
export function tombstoneBatch(logs: readonly Log[], batchId: string, deviceId: string, now: ISOTime): Log[] {
  return logs
    .filter((l) => l.batchId === batchId && !l.deletedAt)
    .map((l) => ({ ...l, deletedAt: now, updatedAt: now, updatedBy: deviceId }));
}

/** Số đối tượng trong một đợt (để hiện nhãn "Đợt: n cây"). */
export function batchSize(logs: readonly Log[], batchId: string): number {
  return logs.filter((l) => l.batchId === batchId && !l.deletedAt).length;
}
