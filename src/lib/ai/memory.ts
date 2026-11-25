import type { AiMemory, AiMemoryCategory, ISODate, ISOTime, Log, Tree } from '../../types/models';
import { AI_MEMORY, ROTATION_ALERT } from '../agronomy';
import { formatDateVN } from '../date';
import { learnedPrice, rotationAlerts, SUPPLIES } from '../supplies';
import { normalizeVi } from '../text';

/**
 * Bộ nhớ "tự học" của trợ lý AI (SPEC M7.1 [1.2]).
 *
 * Vòng đời: AI đề xuất (`learnedMemories`) hoặc chủ vườn tự thêm → chủ vườn **duyệt / sửa / xóa**
 * → mục đã duyệt được nạp lại vào system prompt các lần hỏi sau.
 * "Tự học" = ghi nhớ + rút kinh nghiệm từ nhật ký; KHÔNG huấn luyện lại model.
 */

export const AI_MEMORY_CATEGORIES: readonly AiMemoryCategory[] = ['kinh-nghiem', 'so-thich', 'phan-ung', 'vat-tu', 'khac'];

export const AI_MEMORY_CATEGORY_LABEL: Record<AiMemoryCategory, string> = {
  'kinh-nghiem': 'Kinh nghiệm canh tác',
  'so-thich': 'Thói quen chủ vườn',
  'phan-ung': 'Cây phản ứng với phân/thuốc',
  'vat-tu': 'Vật tư & giá',
  khac: 'Khác',
};

/** Đề xuất ghi nhớ (từ AI hoặc từ form nhập tay) — chưa phải bản ghi. */
export interface MemoryProposal {
  content: string;
  category: AiMemoryCategory;
  targetIds?: string[];
  confidence?: 'thap' | 'vua' | 'cao';
}

export interface MemoryCtx {
  id: string;
  now: ISOTime;
  deviceId: string;
}

/** Chuỗi trông như khóa bí mật / thông tin nhạy cảm — KHÔNG bao giờ được ghi nhớ. */
const SECRET_RE = /(ghp_|github_pat_|gho_|AIza[0-9A-Za-z_-]{10,}|sk-[A-Za-z0-9]{16,}|mật khẩu|mat khau|password|api[ _-]?key|token)/i;

export function looksSensitive(text: string): boolean {
  return SECRET_RE.test(text);
}

/** Chuẩn hóa nội dung: bỏ khoảng trắng thừa, cắt tối đa `AI_MEMORY.maxLength` ký tự. */
export function cleanMemoryText(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > AI_MEMORY.maxLength ? `${t.slice(0, AI_MEMORY.maxLength - 1).trimEnd()}…` : t;
}

/** Khóa so trùng: không dấu, không hoa thường, bỏ dấu câu. */
export function memoryKey(text: string): string {
  return normalizeVi(text)
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isActiveMemory(m: AiMemory): boolean {
  return m.approved && !m.deletedAt;
}

/** Tạo bản ghi mới. Nhập tay (`manual`) mặc định đã duyệt; từ AI mặc định CHỜ duyệt. */
export function createMemory(p: MemoryProposal & { source: AiMemory['source']; approved?: boolean }, ctx: MemoryCtx): AiMemory {
  const content = cleanMemoryText(p.content);
  if (!content) throw new Error('Nội dung ghi nhớ trống');
  if (looksSensitive(content)) throw new Error('Không ghi nhớ mật khẩu, token hay API key');
  return {
    id: ctx.id,
    category: p.category,
    content,
    ...(p.targetIds?.length && { targetIds: [...new Set(p.targetIds)] }),
    source: p.source,
    ...(p.confidence && { confidence: p.confidence }),
    approved: p.approved ?? p.source === 'manual',
    createdAt: ctx.now,
    updatedAt: ctx.now,
    updatedBy: ctx.deviceId,
  };
}

export function approveMemory(m: AiMemory, ctx: Omit<MemoryCtx, 'id'>): AiMemory {
  return { ...m, approved: true, updatedAt: ctx.now, updatedBy: ctx.deviceId };
}

export function editMemory(
  m: AiMemory,
  patch: Partial<Pick<AiMemory, 'content' | 'category' | 'targetIds'>>,
  ctx: Omit<MemoryCtx, 'id'>,
): AiMemory {
  const content = patch.content !== undefined ? cleanMemoryText(patch.content) : m.content;
  if (!content) throw new Error('Nội dung ghi nhớ trống');
  if (looksSensitive(content)) throw new Error('Không ghi nhớ mật khẩu, token hay API key');
  const next: AiMemory = { ...m, ...patch, content, updatedAt: ctx.now, updatedBy: ctx.deviceId };
  if (!next.targetIds?.length) delete next.targetIds;
  return next;
}

/** Xóa mềm (tombstone) để đồng bộ được việc xóa sang máy khác. */
export function deleteMemory(m: AiMemory, ctx: Omit<MemoryCtx, 'id'>): AiMemory {
  return { ...m, deletedAt: ctx.now, updatedAt: ctx.now, updatedBy: ctx.deviceId };
}

/**
 * Lọc đề xuất mới: bỏ nội dung rỗng / nhạy cảm / trùng với ghi nhớ đang có (chưa xóa, kể cả chờ duyệt)
 * hoặc trùng nhau; tối đa `AI_MEMORY.maxProposalsPerAnswer` mục.
 */
export function deduplicateMemories(proposals: readonly MemoryProposal[], existing: readonly AiMemory[]): MemoryProposal[] {
  const seen = new Set(existing.filter((m) => !m.deletedAt).map((m) => memoryKey(m.content)));
  const out: MemoryProposal[] = [];
  for (const p of proposals) {
    const content = cleanMemoryText(p.content);
    const key = memoryKey(content);
    if (!key || looksSensitive(content) || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...p, content });
    if (out.length >= AI_MEMORY.maxProposalsPerAnswer) break;
  }
  return out;
}

/**
 * Chọn ghi nhớ nạp vào prompt: chỉ mục đã duyệt, chưa xóa.
 * Có cây đang hỏi → ưu tiên ghi nhớ của cây đó, rồi ghi nhớ chung cả vườn; bỏ ghi nhớ riêng của cây khác.
 * Không chọn cây → mọi ghi nhớ. Trong mỗi nhóm: mới cập nhật trước. Tối đa `limit`.
 */
export function selectRelevantMemories(
  memories: readonly AiMemory[],
  opts: { targetId?: string; limit?: number } = {},
): AiMemory[] {
  const limit = opts.limit ?? AI_MEMORY.maxInPrompt;
  const rank = (m: AiMemory) => {
    if (!opts.targetId) return 0;
    if (m.targetIds?.includes(opts.targetId)) return 0;
    if (!m.targetIds?.length) return 1;
    return -1;
  };
  return memories
    .filter(isActiveMemory)
    .map((m) => ({ m, r: rank(m) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || (a.m.updatedAt < b.m.updatedAt ? 1 : a.m.updatedAt > b.m.updatedAt ? -1 : 0))
    .slice(0, limit)
    .map((x) => x.m);
}

export function describeMemory(m: AiMemory): string {
  return `- [${AI_MEMORY_CATEGORY_LABEL[m.category]}${m.targetIds?.length ? ` · ${m.targetIds.join(', ')}` : ''}] ${m.content}`;
}

/**
 * Kinh nghiệm rút ra từ nhật ký (tính lại mỗi lần, không lưu):
 * - phun cùng nhóm cơ chế nhiều lần gần đây → nhắc luân phiên;
 * - giá vật tư chủ vườn đã mua gần nhất.
 */
export function logInsights(input: { logs: readonly Log[]; today: ISODate; trees?: readonly Tree[]; targetId?: string }): string[] {
  const codeOf = (id: string) => (id === 'LOT_A' ? 'Lô A' : input.trees?.find((t) => t.id === id)?.code ?? id);
  const out: string[] = [];
  for (const a of rotationAlerts(input.logs, input.today, ROTATION_ALERT)) {
    if (input.targetId && a.targetId !== input.targetId) continue;
    out.push(
      `${codeOf(a.targetId)} đã phun nhóm ${a.group} ${a.count} lần trong ${ROTATION_ALERT.windowDays} ngày (gần nhất ${formatDateVN(a.lastDate)}) — lần sau phải đổi nhóm cơ chế.`,
    );
  }
  for (const s of SUPPLIES) {
    const p = learnedPrice(input.logs, s.id);
    if (p) out.push(`Giá vườn mua ${s.name} gần nhất: ${p.priceVnd.toLocaleString('vi-VN').replace(/,/g, '.')} đ (${formatDateVN(p.date)}).`);
  }
  return out;
}
