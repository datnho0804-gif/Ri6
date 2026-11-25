import type { AiMemoryCategory } from '../../types/models';
import { AI_MEMORY } from '../agronomy';
import { AI_MEMORY_CATEGORIES, cleanMemoryText, looksSensitive, type MemoryProposal } from './memory';

export type AiConfidence = 'thap' | 'vua' | 'cao';

export interface AiAction {
  title: string;
  /** 0–60 ngày kể từ hôm nay. */
  dueInDays: number;
  targetId?: string;
}

export interface AiAnswer {
  answer: string;
  confidence: AiConfidence | null;
  actions: AiAction[];
  /** [1.2] Đề xuất ghi nhớ mới — UI hiện để chủ vườn duyệt, KHÔNG tự lưu. */
  learnedMemories: MemoryProposal[];
}

export const MAX_DUE_IN_DAYS = 60;

/** Schema đầu ra có cấu trúc gửi Gemini (SPEC M7). */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING', description: 'Câu trả lời Markdown tiếng Việt' },
    confidence: { type: 'STRING', enum: ['thap', 'vua', 'cao'] },
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          dueInDays: { type: 'INTEGER' },
          targetId: { type: 'STRING' },
        },
        required: ['title', 'dueInDays'],
      },
    },
    learnedMemories: {
      type: 'ARRAY',
      description: 'Tối đa 3 điều đáng nhớ lâu dài về vườn do chủ vườn cho biết; để trống nếu không có',
      items: {
        type: 'OBJECT',
        properties: {
          content: { type: 'STRING' },
          category: { type: 'STRING', enum: ['kinh-nghiem', 'so-thich', 'phan-ung', 'vat-tu', 'khac'] },
          targetIds: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['content', 'category'],
      },
    },
  },
  required: ['answer', 'confidence', 'actions'],
} as const;

/**
 * Lọc danh sách việc AI đề xuất (T06 AC3): bỏ mục thiếu/sai `title`,
 * kẹp `dueInDays` vào 0–60, bỏ `targetId` không tồn tại (giữ lại việc).
 */
export function parseAiActions(raw: unknown, validTargetIds: ReadonlySet<string>): AiAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AiAction[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!title) continue;
    const n = typeof o.dueInDays === 'number' && Number.isFinite(o.dueInDays) ? Math.round(o.dueInDays) : 0;
    const dueInDays = Math.min(MAX_DUE_IN_DAYS, Math.max(0, n));
    const targetId = typeof o.targetId === 'string' && validTargetIds.has(o.targetId) ? o.targetId : undefined;
    out.push({ title, dueInDays, ...(targetId && { targetId }) });
  }
  return out;
}

/**
 * Lọc đề xuất ghi nhớ (T07 AC3): bỏ mục rỗng / nhạy cảm (token, API key, mật khẩu),
 * cắt độ dài, nhóm lạ → 'khac', bỏ `targetIds` không tồn tại, tối đa `AI_MEMORY.maxProposalsPerAnswer`.
 */
export function parseLearnedMemories(raw: unknown, validTargetIds: ReadonlySet<string>): MemoryProposal[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryProposal[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const content = typeof o.content === 'string' ? cleanMemoryText(o.content) : '';
    if (!content || looksSensitive(content)) continue;
    const category = (AI_MEMORY_CATEGORIES as readonly unknown[]).includes(o.category) ? (o.category as AiMemoryCategory) : 'khac';
    const targetIds = Array.isArray(o.targetIds)
      ? [...new Set(o.targetIds.filter((t): t is string => typeof t === 'string' && validTargetIds.has(t)))]
      : [];
    out.push({ content, category, ...(targetIds.length && { targetIds }) });
    if (out.length >= AI_MEMORY.maxProposalsPerAnswer) break;
  }
  return out;
}

/**
 * Đọc câu trả lời JSON của Gemini. JSON hỏng → `actions = []`, `learnedMemories = []`, vẫn hiện phần chữ (nếu có).
 */
export function parseAiAnswer(text: string, validTargetIds: ReadonlySet<string>): AiAnswer {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const j = JSON.parse(cleaned) as Record<string, unknown>;
    const conf = j.confidence;
    return {
      answer: typeof j.answer === 'string' ? j.answer : '',
      confidence: conf === 'thap' || conf === 'vua' || conf === 'cao' ? conf : null,
      actions: parseAiActions(j.actions, validTargetIds),
      learnedMemories: parseLearnedMemories(j.learnedMemories, validTargetIds),
    };
  } catch {
    // Thử lấy trường "answer" từ JSON bị cắt dở.
    const m = /"answer"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(cleaned);
    let answer = text.trim();
    if (m) {
      try {
        answer = JSON.parse(`"${m[1]}"`) as string;
      } catch {
        answer = m[1];
      }
    }
    return { answer, confidence: null, actions: [], learnedMemories: [] };
  }
}
