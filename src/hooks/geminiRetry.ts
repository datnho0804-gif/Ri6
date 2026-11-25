import { AiError, type FetchLike } from '../lib/ai/gemini';
import type { GeminiModelInfo } from '../lib/ai/models';

/** Transient Google Gemini server statuses that benefit from short backoff retries. */
export const RETRYABLE_GEMINI_STATUSES = new Set([500, 502, 503, 504]);

/** Default retry backoff delays (ms): 2 automatic retries (3 attempts total). */
export const DEFAULT_GEMINI_RETRY_DELAYS_MS: readonly number[] = [1200, 2500];

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface RetryingFetchOptions {
  baseFetch?: FetchLike;
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, maxRetries: number, status: number) => void;
}

/**
 * Wraps `fetch` for `createGeminiClient(apiKey, fetchFn)` with automatic short-backoff
 * retries on transient Gemini server overload errors (HTTP 500/502/503/504).
 * Never retries 400 (schema fallback), 401/403 (auth), or 429 (quota).
 */
export function createRetryingGeminiFetch(opts: RetryingFetchOptions = {}): FetchLike {
  const baseFetch: FetchLike = opts.baseFetch ?? ((input, init) => fetch(input, init));
  const delays = opts.retryDelaysMs ?? DEFAULT_GEMINI_RETRY_DELAYS_MS;
  const sleep = opts.sleep ?? defaultSleep;

  return async (input: string, init?: RequestInit): Promise<Response> => {
    let attempt = 0;
    while (true) {
      const res = await baseFetch(input, init);
      if (!RETRYABLE_GEMINI_STATUSES.has(res.status) || attempt >= delays.length) {
        return res;
      }
      attempt += 1;
      opts.onRetry?.(attempt, delays.length, res.status);
      await sleep(delays[attempt - 1]);
    }
  };
}

/** True when `err` is a transient Gemini server-overload/unavailable error (500/502/503/504). */
export function isGeminiOverloadedError(err: unknown): err is AiError {
  return (
    err instanceof AiError &&
    typeof err.status === 'number' &&
    RETRYABLE_GEMINI_STATUSES.has(err.status)
  );
}

/** User-friendly Vietnamese message for Gemini errors, clarifying HTTP 503 overload clearly. */
export function formatGeminiErrorMessage(err: unknown): string {
  if (isGeminiOverloadedError(err)) {
    return `Máy chủ Google Gemini đang quá tải tạm thời (HTTP ${err.status}). Hãy bấm Thử gửi lại sau vài giây hoặc chuyển sang model nhẹ hơn (như Flash-Lite).`;
  }
  if (err instanceof AiError) {
    return err.message;
  }
  return 'Không gửi được câu hỏi tới Gemini. Câu hỏi của bạn vẫn được giữ nguyên.';
}

const isUnstableModel = (name: string) => /(preview|exp)/i.test(name);

const modelVersion = (name: string) => {
  const m = /gemini-(\d+)(?:\.(\d+))?/i.exec(name);
  return m ? Number(m[1]) * 100 + Number(m[2] ?? 0) : 0;
};

/**
 * Picks an alternative Gemini chat model from the API list when `currentModel` is overloaded (503).
 * Never hard-codes model names: prefers stable `flash-lite` -> stable `flash` -> other stable models.
 */
export function pickFallbackGeminiModel(
  models: readonly GeminiModelInfo[],
  currentModel: string,
): string | null {
  const normCurrent = currentModel.startsWith('models/') ? currentModel : `models/${currentModel}`;
  const candidates = models.filter((m) => m.name !== normCurrent);
  if (candidates.length === 0) return null;

  const score = (n: string): readonly [number, number, number, number] => [
    isUnstableModel(n) ? 0 : 1,
    /flash-lite|lite/i.test(n) ? 2 : /flash/i.test(n) ? 1 : 0,
    modelVersion(n),
    0,
  ];

  return [...candidates].sort((a, b) => {
    const x = score(a.name);
    const y = score(b.name);
    for (let i = 0; i < x.length; i += 1) {
      if (x[i] !== y[i]) return y[i] - x[i];
    }
    return a.name.localeCompare(b.name);
  })[0].name;
}
