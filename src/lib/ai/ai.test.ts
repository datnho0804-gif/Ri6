import { describe, expect, it } from 'vitest';
import { AiError, createGeminiClient, rememberSchemaUnsupported, type FetchLike } from './gemini';
import { filterChatModels, pickDefaultModel, type GeminiModelInfo } from './models';
import { parseAiActions, parseAiAnswer } from './parse';
import { AI_DISCLAIMER, buildCopyPromptFallback, buildSystemPrompt } from './prompt';
import { makeLog, makeTree } from '../testFixtures';

const gc = ['generateContent', 'countTokens'];
const M = (name: string, methods = gc): GeminiModelInfo => ({ name: `models/${name}`, supportedGenerationMethods: methods });

describe('filterChatModels / pickDefaultModel (T06 AC1 [1.1])', () => {
  const list = [
    M('gemini-3.0-flash'),
    M('gemini-3.0-flash-preview-10-2026'),
    M('gemini-3.0-pro'),
    M('gemini-3.0-flash-lite'),
    M('gemini-2.5-flash'),
    M('gemini-3.0-flash-preview-tts'),
    M('gemini-3.0-flash-native-audio'),
    M('gemini-embedding-001', ['embedContent']),
    M('gemini-3.0-flash-image'),
    M('gemini-3.0-flash-live'),
    M('imagen-4'),
    M('gemini-1.0-pro-vision', ['countTokens']),
  ];
  it('giữ flash / pro / flash-lite; loại tts, audio, embedding, sinh ảnh, live, imagen, model không có generateContent', () => {
    expect(filterChatModels(list).map((m) => m.name)).toEqual([
      'models/gemini-3.0-flash',
      'models/gemini-3.0-flash-preview-10-2026',
      'models/gemini-3.0-pro',
      'models/gemini-3.0-flash-lite',
      'models/gemini-2.5-flash',
    ]);
  });
  it('mặc định: flash ổn định, phiên bản cao nhất — ưu tiên hơn bản preview cùng phiên bản và bản lite', () => {
    expect(pickDefaultModel(list)).toBe('models/gemini-3.0-flash');
    expect(pickDefaultModel([M('gemini-3.0-flash-preview'), M('gemini-2.5-flash')])).toBe('models/gemini-2.5-flash');
    expect(pickDefaultModel([M('gemini-9-pro')])).toBe('models/gemini-9-pro');
    expect(pickDefaultModel([])).toBeNull();
  });
});

describe('buildSystemPrompt (T06 AC2)', () => {
  const tree = { ...makeTree({ id: 'SR01', label: 'SR01 · Góc cổng', ageYears: 4, flowerDate: '2026-09-26' }), githubToken: 'ghp_SECRET', geminiApiKey: 'AIza_SECRET' };
  const logs = Array.from({ length: 13 }, (_, i) => makeLog({ id: `l${i}`, targetId: 'SR01', date: `2026-11-${String(i + 1).padStart(2, '0')}`, type: 'tuoi', note: `ghi chú ${i}` }));
  const p = buildSystemPrompt({ season: 'kho', today: '2026-11-24', tree, logs });
  it('có bối cảnh và quy tắc từ agronomy.ts', () => {
    for (const s of ['Lộc Tấn', 'đất đỏ bazan', 'mùa khô', '5,5–6,5', '90–105', 'FRAC/IRAC', 'theo nhãn', 'KHÔNG nêu liều lượng']) expect(p).toContain(s);
  });
  it('cây đang hỏi: label + tối đa 10 nhật ký, mới → cũ', () => {
    expect(p).toContain('SR01 · Góc cổng');
    expect(p).toContain('ngày 59');
    expect(p).toContain('10 nhật ký gần nhất');
    expect(p.indexOf('13/11/2026')).toBeLessThan(p.indexOf('04/11/2026'));
    expect(p).not.toContain('03/11/2026');
  });
  it('KHÔNG chứa token/API key kể cả khi bản ghi lỡ mang theo', () => expect(p).not.toMatch(/SECRET|githubToken|geminiApiKey/));
  it('không chọn cây → không có phần CÂY ĐANG HỎI; Copy Prompt dự phòng ghép câu hỏi', () => {
    const q = buildSystemPrompt({ season: 'mua', today: '2026-06-01' });
    expect(q).not.toContain('CÂY ĐANG HỎI');
    expect(q).toContain('mùa mưa');
    expect(buildCopyPromptFallback(q, '  Lá vàng là bệnh gì? ')).toMatch(/CÂU HỎI CỦA TÔI:\nLá vàng là bệnh gì\?$/);
    expect(AI_DISCLAIMER).toContain('Danh mục');
  });
});

describe('parseAiActions / parseAiAnswer (T06 AC3)', () => {
  const valid = new Set(['SR01', 'LOT_A']);
  it('thiếu title → loại; 99 → 60; -3 → 0; SR99 → bỏ targetId, giữ việc', () => {
    expect(parseAiActions([{ dueInDays: 3 }, { title: '  ', dueInDays: 1 }, { title: 'A', dueInDays: 99 }, { title: 'B', dueInDays: -3, targetId: 'SR01' }, { title: 'C', dueInDays: 2.6, targetId: 'SR99' }], valid)).toEqual([
      { title: 'A', dueInDays: 60 },
      { title: 'B', dueInDays: 0, targetId: 'SR01' },
      { title: 'C', dueInDays: 3 },
    ]);
  });
  it('JSON hỏng → actions [] và vẫn lấy được phần chữ', () => {
    expect(parseAiAnswer('{"answer":"Cây bị nhện đỏ\\nNên soi mặt dưới lá","confid', valid)).toEqual({ answer: 'Cây bị nhện đỏ\nNên soi mặt dưới lá', confidence: null, actions: [] });
    expect(parseAiAnswer('chữ thường không phải JSON', valid)).toEqual({ answer: 'chữ thường không phải JSON', confidence: null, actions: [] });
  });
  it('JSON hợp lệ (có thể bọc ```json)', () => {
    const r = parseAiAnswer('```json\n{"answer":"OK","confidence":"vua","actions":[{"title":"Kiểm tra lại","dueInDays":7,"targetId":"SR01"}]}\n```', valid);
    expect(r).toEqual({ answer: 'OK', confidence: 'vua', actions: [{ title: 'Kiểm tra lại', dueInDays: 7, targetId: 'SR01' }] });
  });
});

/* ---------- Gemini giả lập ---------- */
function fakeGemini(plan: Array<number | { status: number; body: unknown }>) {
  const reqs: Array<{ url: string; headers: Record<string, string>; body?: Record<string, unknown> }> = [];
  const fetchFn: FetchLike = async (url, init = {}) => {
    reqs.push({ url, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const step = plan.shift() ?? 500;
    const { status, body } = typeof step === 'number' ? { status: step, body: { error: { message: 'x' } } } : step;
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { fetchFn, reqs };
}
const okJson = (obj: unknown) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } });
const okText = (t: string) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: t }] } }] } });
const req = (extra = {}) => ({ model: 'gemini-3.0-flash', systemPrompt: 'SYS', turns: [{ role: 'user' as const, text: 'Lá vàng?', images: [{ mime: 'image/jpeg', base64: 'AAAA' }] }], validTargetIds: new Set(['SR01']), ...extra });

describe('Gemini client (T06 AC1, AC7 [1.1])', () => {
  it('gửi key qua header (không trong URL), ảnh inline, schema JSON; đọc câu trả lời có cấu trúc', async () => {
    const g = fakeGemini([okJson({ answer: 'Nhện đỏ', confidence: 'cao', actions: [{ title: 'Phun nhắc', dueInDays: 7, targetId: 'SR01' }] })]);
    const r = await createGeminiClient('AIza-test', g.fetchFn).generate(req());
    expect(r).toMatchObject({ answer: 'Nhện đỏ', confidence: 'cao', usedSchema: true, actions: [{ title: 'Phun nhắc', dueInDays: 7, targetId: 'SR01' }] });
    expect(g.reqs[0].url).toMatch(/\/models\/gemini-3\.0-flash:generateContent$/);
    expect(g.reqs[0].url).not.toContain('AIza');
    expect(g.reqs[0].headers['x-goog-api-key']).toBe('AIza-test');
    const contents = g.reqs[0].body!.contents as Array<{ parts: Array<Record<string, unknown>> }>;
    expect(contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } });
    expect(g.reqs[0].body!.generationConfig).toMatchObject({ responseMimeType: 'application/json' });
  });
  it('(a) lần 1 trả 400 → lần 2 KHÔNG có schema → hiện câu trả lời, actions [], báo model không hỗ trợ', async () => {
    const g = fakeGemini([400, okText('Trả lời dạng **Markdown**')]);
    const r = await createGeminiClient('k', g.fetchFn).generate(req());
    expect(r).toEqual({ answer: 'Trả lời dạng **Markdown**', confidence: null, actions: [], usedSchema: false, schemaUnsupportedDetected: true });
    expect(g.reqs).toHaveLength(2);
    expect(g.reqs[1].body!.generationConfig).toBeUndefined();
    expect(rememberSchemaUnsupported(undefined, 'gemini-3.0-flash')).toEqual(['models/gemini-3.0-flash']);
  });
  it('(b) model đã nằm trong geminiSchemaUnsupported → chỉ 1 request, không kèm schema', async () => {
    const g = fakeGemini([okText('OK')]);
    const r = await createGeminiClient('k', g.fetchFn).generate(req({ schemaUnsupported: ['models/gemini-3.0-flash'] }));
    expect(g.reqs).toHaveLength(1);
    expect(g.reqs[0].body!.generationConfig).toBeUndefined();
    expect(r.schemaUnsupportedDetected).toBe(false);
  });
  it('(c) 429 / 401 / mất mạng → AiError, KHÔNG fallback', async () => {
    for (const [status, kind] of [[429, 'quota'], [401, 'auth'], [403, 'auth']] as const) {
      const g = fakeGemini([status]);
      await expect(createGeminiClient('k', g.fetchFn).generate(req())).rejects.toMatchObject({ kind });
      expect(g.reqs).toHaveLength(1);
    }
    await expect(createGeminiClient('k', async () => { throw new TypeError('offline'); }).generate(req())).rejects.toBeInstanceOf(AiError);
    expect(() => createGeminiClient('  ')).toThrow(AiError);
  });
  it('câu hỏi bị chặn (promptFeedback) → AiError blocked', async () => {
    const g = fakeGemini([{ status: 200, body: { promptFeedback: { blockReason: 'SAFETY' } } }]);
    await expect(createGeminiClient('k', g.fetchFn).generate(req())).rejects.toMatchObject({ kind: 'blocked' });
  });
  it('listChatModels: phân trang + lọc', async () => {
    const g = fakeGemini([
      { status: 200, body: { models: [M('gemini-3.0-flash'), M('gemini-3.0-flash-preview-tts')], nextPageToken: 'p2' } },
      { status: 200, body: { models: [M('gemini-embedding-001', ['embedContent']), M('gemini-3.0-pro')] } },
    ]);
    const models = await createGeminiClient('k', g.fetchFn).listChatModels();
    expect(models.map((m) => m.name)).toEqual(['models/gemini-3.0-flash', 'models/gemini-3.0-pro']);
    expect(g.reqs[1].url).toContain('pageToken=p2');
  });
});
