import { filterChatModels, type GeminiModelInfo } from './models';
import { parseAiAnswer, RESPONSE_SCHEMA, type AiAnswer } from './parse';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const API = 'https://generativelanguage.googleapis.com/v1beta';

export type AiErrorKind = 'auth' | 'quota' | 'network' | 'blocked' | 'bad-request' | 'unknown';

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly status?: number;
  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
    this.status = status;
  }
}

export const AI_ERROR_LABEL: Record<AiErrorKind, string> = {
  auth: 'API key Gemini không đúng hoặc chưa được bật — kiểm tra trong Cài đặt',
  quota: 'Đã hết hạn mức Gemini (429) — thử lại sau ít phút',
  network: 'Không kết nối được Gemini — kiểm tra mạng',
  blocked: 'Gemini từ chối trả lời câu này — thử diễn đạt lại',
  'bad-request': 'Yêu cầu không hợp lệ gửi tới Gemini',
  unknown: 'Lỗi Gemini không xác định',
};

function errorFor(status: number): AiError {
  if (status === 401 || status === 403) return new AiError('auth', AI_ERROR_LABEL.auth, status);
  if (status === 429) return new AiError('quota', AI_ERROR_LABEL.quota, status);
  if (status === 400) return new AiError('bad-request', AI_ERROR_LABEL['bad-request'], status);
  return new AiError('unknown', `${AI_ERROR_LABEL.unknown} (HTTP ${status})`, status);
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  /** Ảnh đã nén (≤ 1280 px), base64 không có tiền tố data:. */
  images?: Array<{ mime: string; base64: string }>;
}

export interface GenerateResult extends AiAnswer {
  /** false nếu đã phải gọi lại không kèm schema (fallback Markdown). */
  usedSchema: boolean;
  /** true khi vừa phát hiện model không hỗ trợ schema → UI ghi vào `settings.geminiSchemaUnsupported`. */
  schemaUnsupportedDetected: boolean;
}

/**
 * Client Gemini REST (SPEC M7) — gọi bằng `fetch`, không cần SDK.
 * API key gửi qua header `x-goog-api-key` (không nằm trong URL).
 */
export function createGeminiClient(apiKey: string, fetchFn: FetchLike = (i, init) => fetch(i, init)) {
  if (!apiKey.trim()) throw new AiError('auth', AI_ERROR_LABEL.auth);
  const headers = { 'x-goog-api-key': apiKey.trim(), 'Content-Type': 'application/json' };

  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await fetchFn(`${API}${path}`, { ...init, headers });
    } catch {
      throw new AiError('network', AI_ERROR_LABEL.network);
    }
  }

  return {
    /** Danh sách model dùng được cho hỏi đáp (đã lọc, có phân trang). */
    async listChatModels(): Promise<GeminiModelInfo[]> {
      const all: GeminiModelInfo[] = [];
      let token = '';
      for (let page = 0; page < 10; page += 1) {
        const res = await call(`/models?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
        if (!res.ok) throw errorFor(res.status);
        const j = (await res.json()) as { models?: GeminiModelInfo[]; nextPageToken?: string };
        all.push(...(j.models ?? []));
        if (!j.nextPageToken) break;
        token = j.nextPageToken;
      }
      return filterChatModels(all);
    },

    /**
     * Gọi `generateContent`. Mặc định yêu cầu JSON theo `RESPONSE_SCHEMA`;
     * nếu bị **HTTP 400** → tự gọi lại 1 lần KHÔNG kèm schema, coi `actions = []`, `learnedMemories = []` (SPEC M7 [1.1]).
     * Model nằm trong `schemaUnsupported` → gọi thẳng chế độ Markdown (1 request).
     * 401/403/429/mạng → `AiError`, KHÔNG fallback.
     */
    async generate(req: {
      model: string;
      systemPrompt: string;
      turns: readonly ChatTurn[];
      validTargetIds: ReadonlySet<string>;
      schemaUnsupported?: readonly string[];
    }): Promise<GenerateResult> {
      const model = req.model.startsWith('models/') ? req.model : `models/${req.model}`;
      const contents = req.turns.map((t) => ({
        role: t.role,
        parts: [...(t.images ?? []).map((im) => ({ inlineData: { mimeType: im.mime, data: im.base64 } })), { text: t.text }],
      }));
      const send = async (withSchema: boolean) =>
        call(`/${model}:generateContent`, {
          method: 'POST',
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.systemPrompt }] },
            contents,
            ...(withSchema && { generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA } }),
          }),
        });
      const textOf = async (res: Response) => {
        const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>; promptFeedback?: { blockReason?: string } };
        if (j.promptFeedback?.blockReason || !j.candidates?.length) throw new AiError('blocked', AI_ERROR_LABEL.blocked);
        return (j.candidates[0].content?.parts ?? []).map((p) => p.text ?? '').join('');
      };

      const skipSchema = (req.schemaUnsupported ?? []).some((m) => m === model || `models/${m}` === model);
      if (!skipSchema) {
        const res = await send(true);
        if (res.ok) return { ...parseAiAnswer(await textOf(res), req.validTargetIds), usedSchema: true, schemaUnsupportedDetected: false };
        if (res.status !== 400) throw errorFor(res.status);
      }
      const res = await send(false);
      if (!res.ok) throw errorFor(res.status);
      return { answer: (await textOf(res)).trim(), confidence: null, actions: [], learnedMemories: [], usedSchema: false, schemaUnsupportedDetected: !skipSchema };
    },
  };
}

export type GeminiClient = ReturnType<typeof createGeminiClient>;

/** Thêm model vào danh sách "không hỗ trợ schema" (lưu ở Settings, cục bộ). */
export function rememberSchemaUnsupported(list: readonly string[] | undefined, model: string): string[] {
  const set = new Set(list ?? []);
  set.add(model.startsWith('models/') ? model : `models/${model}`);
  return [...set];
}
