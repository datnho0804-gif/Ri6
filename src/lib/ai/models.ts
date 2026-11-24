/** Model trả về từ `GET /v1beta/models` (rút gọn). */
export interface GeminiModelInfo {
  name: string; // "models/gemini-2.5-flash"
  displayName?: string;
  supportedGenerationMethods?: string[];
}

/** Biến thể KHÔNG dùng cho hỏi đáp chữ + ảnh (SPEC M7 [1.1]). "image" ở đây là model SINH ảnh. */
export const EXCLUDED_MODEL_RE = /(audio|tts|embed|image|imagen|live|aqa|robotics|computer-use)/i;

/** Giữ model `models/gemini*` có `generateContent`, loại biến thể âm thanh/TTS/embedding/sinh ảnh/live. */
export function filterChatModels(models: readonly GeminiModelInfo[]): GeminiModelInfo[] {
  return models.filter(
    (m) => m.name.startsWith('models/gemini') && (m.supportedGenerationMethods ?? []).includes('generateContent') && !EXCLUDED_MODEL_RE.test(m.name),
  );
}

const isUnstable = (name: string) => /(preview|exp)/i.test(name);
const versionOf = (name: string) => {
  const m = /gemini-(\d+)(?:\.(\d+))?/i.exec(name);
  return m ? Number(m[1]) * 100 + Number(m[2] ?? 0) : 0;
};

/**
 * Chọn model mặc định: có "flash", ưu tiên bản ổn định (không preview/exp),
 * ưu tiên bản đầy đủ hơn "lite", rồi số phiên bản cao nhất. Không hard-code tên model.
 */
export function pickDefaultModel(models: readonly GeminiModelInfo[]): string | null {
  const flash = filterChatModels(models).filter((m) => /flash/i.test(m.name));
  if (flash.length === 0) return filterChatModels(models)[0]?.name ?? null;
  const score = (n: string) => [isUnstable(n) ? 0 : 1, /lite/i.test(n) ? 0 : 1, versionOf(n)];
  return [...flash].sort((a, b) => {
    const [x, y] = [score(a.name), score(b.name)];
    for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return y[i] - x[i];
    return a.name < b.name ? -1 : 1;
  })[0].name;
}

/** Tên hiển thị gọn: "models/gemini-2.5-flash" → "gemini-2.5-flash". */
export const modelLabel = (name: string) => name.replace(/^models\//, '');
