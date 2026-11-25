import { describe, expect, it, vi } from 'vitest';
import { AiError, createGeminiClient } from '../lib/ai/gemini';
import type { GeminiModelInfo } from '../lib/ai/models';
import {
  createRetryingGeminiFetch,
  formatGeminiErrorMessage,
  isGeminiOverloadedError,
  pickFallbackGeminiModel,
} from './geminiRetry';

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('geminiRetry (HTTP 503 handling)', () => {
  it('retries HTTP 503 twice with backoff and succeeds on attempt 3', async () => {
    const sleeps: number[] = [];
    const retries: Array<[number, number, number]> = [];
    let calls = 0;

    const baseFetch = vi.fn(async () => {
      calls += 1;
      if (calls < 3) {
        return jsonRes(503, { error: { code: 503, message: 'The model is overloaded.' } });
      }
      return jsonRes(200, {
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  text: JSON.stringify({
                    answer: 'Cây ổn, giữ lịch tưới mùa khô.',
                    confidence: 'cao',
                    actions: [],
                    learnedMemories: [],
                  }),
                },
              ],
            },
          },
        ],
      });
    });

    const retryingFetch = createRetryingGeminiFetch({
      baseFetch,
      retryDelaysMs: [1000, 2500],
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      onRetry: (attempt, max, status) => {
        retries.push([attempt, max, status]);
      },
    });

    const client = createGeminiClient('AIzaTestKey', retryingFetch);
    const res = await client.generate({
      model: 'models/gemini-2.5-flash',
      systemPrompt: 'test',
      turns: [{ role: 'user', text: 'Xin tư vấn' }],
      validTargetIds: new Set(['SR01']),
    });

    expect(res.answer).toBe('Cây ổn, giữ lịch tưới mùa khô.');
    expect(calls).toBe(3);
    expect(sleeps).toEqual([1000, 2500]);
    expect(retries).toEqual([
      [1, 2, 503],
      [2, 2, 503],
    ]);
  });

  it('throws AiError with status 503 and clear Vietnamese message after retries exhausted', async () => {
    let calls = 0;
    const retryingFetch = createRetryingGeminiFetch({
      baseFetch: async () => {
        calls += 1;
        return jsonRes(503, { error: { code: 503, message: 'Service Unavailable' } });
      },
      retryDelaysMs: [10, 20],
      sleep: async () => {},
    });

    const client = createGeminiClient('AIzaTestKey', retryingFetch);
    let caught: unknown;
    try {
      await client.generate({
        model: 'models/gemini-2.5-flash',
        systemPrompt: 'test',
        turns: [{ role: 'user', text: 'Hỏi' }],
        validTargetIds: new Set(),
      });
    } catch (err) {
      caught = err;
    }

    expect(calls).toBe(3);
    expect(isGeminiOverloadedError(caught)).toBe(true);
    expect((caught as AiError).status).toBe(503);
    expect(formatGeminiErrorMessage(caught)).toContain('HTTP 503');
    expect(formatGeminiErrorMessage(caught)).toContain('quá tải tạm thời');
    expect(formatGeminiErrorMessage(caught)).toContain('Flash-Lite');
  });

  it('does NOT retry 401, 429, or 400 (preserving AC7 error & schema fallback)', async () => {
    for (const status of [401, 429, 400]) {
      let calls = 0;
      const retryingFetch = createRetryingGeminiFetch({
        baseFetch: async () => {
          calls += 1;
          return jsonRes(status, { error: { code: status } });
        },
        retryDelaysMs: [10, 20],
        sleep: async () => {},
      });

      const res = await retryingFetch('https://example.test');
      expect(res.status).toBe(status);
      expect(calls).toBe(1);
    }
  });

  it('picks a stable flash-lite fallback model when current flash model is overloaded', () => {
    const models: GeminiModelInfo[] = [
      { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview', supportedGenerationMethods: ['generateContent'] },
    ];

    expect(pickFallbackGeminiModel(models, 'models/gemini-2.5-flash')).toBe(
      'models/gemini-2.5-flash-lite',
    );
    expect(pickFallbackGeminiModel(models, 'models/gemini-2.5-flash-lite')).toBe(
      'models/gemini-2.5-flash',
    );
    expect(pickFallbackGeminiModel([models[1]], 'models/gemini-2.5-flash')).toBeNull();
  });
});
