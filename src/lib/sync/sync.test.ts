import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SyncStore } from './engine';
import { syncOnce } from './engine';
import { base64ToBytes, base64ToUtf8, bytesToBase64, utf8ToBase64 } from './base64';
import { createGitHubClient, type FetchLike } from './github';
import { createSyncScheduler } from './scheduler';
import { parseState, photoPath, STATE_PATH } from './stateFile';
import { emptySyncState, type SyncState } from '../merge';
import { duplicateCodes } from '../treeCodes';
import { makeLog, makePhoto, makeTree } from '../testFixtures';
import type { SyncMeta } from '../../types/models';

/* ---------- GitHub giả lập trong bộ nhớ (kiểm sha như thật) ---------- */
function fakeGitHub(opts: { bigThreshold?: number; isPrivate?: boolean; canPush?: boolean } = {}) {
  const files = new Map<string, { bytes: Uint8Array; sha: string }>();
  const calls: string[] = [];
  let n = 0;
  let beforePut: (() => void) | null = null;
  let forceStatus: number | null = null;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetchFn: FetchLike = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method ?? 'GET';
    calls.push(`${method} ${u.pathname}`);
    if (forceStatus) return json(forceStatus, { message: 'forced' });
    if (/^\/repos\/[^/]+\/[^/]+$/.test(u.pathname)) {
      return json(200, { private: opts.isPrivate ?? true, size: 1234, default_branch: 'main', permissions: { push: opts.canPush ?? true } });
    }
    const blob = u.pathname.match(/\/git\/blobs\/(.+)$/);
    if (blob) {
      const f = [...files.values()].find((x) => x.sha === blob[1]);
      return f ? json(200, { content: bytesToBase64(f.bytes), encoding: 'base64' }) : json(404, {});
    }
    const c = u.pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (!c) return json(404, {});
    const path = c[1].split('/').map(decodeURIComponent).join('/');
    const accept = (init.headers as Record<string, string>)?.Accept ?? '';
    if (method === 'GET') {
      const f = files.get(path);
      if (!f) return json(404, { message: 'Not Found' });
      if (accept.includes('raw')) return new Response(f.bytes as BodyInit, { status: 200 });
      if (f.bytes.length > (opts.bigThreshold ?? Infinity)) return json(200, { sha: f.sha, encoding: 'none', content: '' });
      return json(200, { sha: f.sha, encoding: 'base64', content: bytesToBase64(f.bytes).replace(/(.{60})/g, '$1\n') });
    }
    if (method === 'PUT') {
      const body = JSON.parse(String(init.body)) as { content: string; sha?: string; message: string };
      if (beforePut) { const fn = beforePut; beforePut = null; fn(); }
      const cur = files.get(path);
      if (cur && !body.sha) return json(422, { message: "sha wasn't supplied" });
      if ((cur && body.sha !== cur.sha) || (!cur && body.sha)) return json(409, { message: 'conflict' });
      const sha = `sha-${++n}`;
      files.set(path, { bytes: base64ToBytes(body.content), sha });
      calls.push(`  msg: ${body.message}`);
      return json(201, { content: { sha } });
    }
    return json(405, {});
  };
  return {
    fetchFn,
    files,
    calls,
    puts: () => calls.filter((c) => c.startsWith(`PUT`) && c.endsWith('data/state.json')).length,
    remoteState: () => parseState(new TextDecoder().decode(files.get(STATE_PATH)!.bytes)),
    onceBeforePut: (fn: () => void) => { beforePut = fn; },
    alwaysConflict: () => { beforePut = null; const orig = fetchFn; return orig; },
    force: (s: number | null) => { forceStatus = s; },
    /** Ghi thẳng file (giả lập máy khác vừa ghi). */
    rawWrite: (path: string, text: string) => files.set(path, { bytes: new TextEncoder().encode(text), sha: `sha-${++n}` }),
  };
}

/* ---------- Kho cục bộ trong bộ nhớ (thay Dexie) ---------- */
function memStore(initial: Partial<SyncState> = {}, photoBytes = new Map<string, Uint8Array>()) {
  let state: SyncState = { ...emptySyncState(), ...initial };
  const put = <T extends SyncMeta>(arr: T[], recs: T[]) => {
    const m = new Map(arr.map((r) => [r.id, r]));
    for (const r of recs) m.set(r.id, r);
    return [...m.values()];
  };
  const store: SyncStore = {
    loadState: async () => structuredClone(state),
    saveState: async (s) => {
      state = { trees: put(state.trees, s.trees), lots: put(state.lots, s.lots), logs: put(state.logs, s.logs), tasks: put(state.tasks, s.tasks), photos: put(state.photos, s.photos) };
    },
    pendingPhotoUploads: async () =>
      state.photos.filter((p) => !p.remotePath && !p.deletedAt && photoBytes.has(p.id)).map((p) => ({ photo: p, bytes: photoBytes.get(p.id)!, mime: 'image/webp' })),
  };
  return { store, get: () => state, set: (fn: (s: SyncState) => SyncState) => { state = fn(state); } };
}

let tick = 0;
const clock = () => new Date(Date.UTC(2026, 10, 25, 0, 0, tick++)).toISOString();
const cfg = { token: 'ghp_test', repo: 'datnho0804-gif/Ri6-data', branch: 'main' };
const device = (gh: ReturnType<typeof fakeGitHub>, store: SyncStore, id: string) => () =>
  syncOnce({ client: createGitHubClient(cfg, gh.fetchFn), store, deviceId: id, deviceName: `Máy ${id}`, now: clock, sleep: async () => {} });

afterEach(() => vi.useRealTimers());

describe('base64 UTF-8 (T04 AC4)', () => {
  it('"Sầu riêng Ri6 – Lộc Tấn, Đồng Nai" mã hóa rồi giải mã đúng như ban đầu', () => {
    const s = 'Sầu riêng Ri6 – Lộc Tấn, Đồng Nai 🌳';
    expect(base64ToUtf8(utf8ToBase64(s))).toBe(s);
    expect(() => btoa(s)).toThrow(); // lý do không dùng btoa trực tiếp
  });
  it('nhị phân lớn (ảnh) khứ hồi', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('GitHub client — Kiểm tra kết nối (T04 AC1)', () => {
  it('repo riêng tư + có quyền push', async () => {
    const gh = fakeGitHub();
    expect(await createGitHubClient(cfg, gh.fetchFn).checkRepo()).toEqual({ private: true, canPush: true, sizeKB: 1234, defaultBranch: 'main' });
  });
  it('repo công khai → private=false (UI cảnh báo đỏ); thiếu quyền push → canPush=false', async () => {
    const gh = fakeGitHub({ isPrivate: false, canPush: false });
    expect(await createGitHubClient(cfg, gh.fetchFn).checkRepo()).toMatchObject({ private: false, canPush: false });
  });
  it('401 → lỗi auth; mất mạng → lỗi network; thiếu token → config', async () => {
    const gh = fakeGitHub();
    gh.force(401);
    await expect(createGitHubClient(cfg, gh.fetchFn).checkRepo()).rejects.toMatchObject({ kind: 'auth' });
    await expect(createGitHubClient(cfg, async () => { throw new TypeError('Failed to fetch'); }).checkRepo()).rejects.toMatchObject({ kind: 'network' });
    expect(() => createGitHubClient({ ...cfg, token: '' })).toThrow();
  });
  it('file > 1 MB (encoding none) đọc qua Git Blobs API', async () => {
    const gh = fakeGitHub({ bigThreshold: 10 });
    gh.rawWrite('data/state.json', '{"schemaVersion":1,"trees":[]} '.repeat(3));
    const r = await createGitHubClient(cfg, gh.fetchFn).getText('data/state.json');
    expect(r?.text).toContain('schemaVersion');
    expect(gh.calls.some((c) => c.includes('/git/blobs/'))).toBe(true);
  });
});

describe('syncOnce — thuật toán SPEC §6', () => {
  it('repo trống → tạo state.json; lần sau không có gì → không PUT', async () => {
    const gh = fakeGitHub();
    const a = memStore({ trees: [makeTree({ id: 'SR01' })] });
    const r1 = await device(gh, a.store, 'A')();
    expect(r1).toMatchObject({ status: 'ok', pushed: true, pushedChanges: 1 });
    expect(gh.calls).toContain('  msg: sync(Máy A): 1 thay đổi');
    expect(gh.remoteState().trees.map((t) => t.id)).toEqual(['SR01']);
    const r2 = await device(gh, a.store, 'A')();
    expect(r2).toMatchObject({ status: 'ok', pushed: false });
    expect(gh.puts()).toBe(1);
  });

  it('lệch sha 1 lần (máy khác vừa ghi) → đọc lại, merge, ghi thành công, không mất dữ liệu máy kia', async () => {
    const gh = fakeGitHub();
    const a = memStore({ trees: [makeTree({ id: 'SR01' })] });
    await device(gh, a.store, 'A')();
    a.set((s) => ({ ...s, logs: [makeLog({ id: 'la', targetId: 'SR01', date: '2026-11-25' })] }));
    gh.onceBeforePut(() => {
      const st = gh.remoteState();
      gh.rawWrite(STATE_PATH, JSON.stringify({ schemaVersion: 1, ...st, logs: [makeLog({ id: 'lb', targetId: 'SR01', date: '2026-11-25' })] }));
    });
    const r = await device(gh, a.store, 'A')();
    expect(r).toMatchObject({ status: 'ok', pushed: true });
    expect(gh.remoteState().logs.map((l) => l.id)).toEqual(['la', 'lb']);
    expect(a.get().logs.map((l) => l.id).sort()).toEqual(['la', 'lb']);
  });

  it('lệch sha liên tục quá 3 lần → lỗi conflict, không ghi đè', async () => {
    const gh = fakeGitHub();
    const a = memStore({ trees: [makeTree({ id: 'SR01' })] });
    await device(gh, a.store, 'A')();
    a.set((s) => ({ ...s, logs: [makeLog({ id: 'la', targetId: 'SR01', date: '2026-11-25' })] }));
    const bump = () => { gh.rawWrite(STATE_PATH, JSON.stringify({ schemaVersion: 1, ...gh.remoteState() })); gh.onceBeforePut(bump); };
    gh.onceBeforePut(bump);
    expect(await device(gh, a.store, 'A')()).toMatchObject({ status: 'error', kind: 'conflict' });
  });

  it('401 → lỗi auth; state.json hỏng → invalid-data, không PUT', async () => {
    const gh = fakeGitHub();
    const a = memStore({ trees: [makeTree({ id: 'SR01' })] });
    gh.force(401);
    expect(await device(gh, a.store, 'A')()).toMatchObject({ status: 'error', kind: 'auth' });
    gh.force(null);
    gh.rawWrite(STATE_PATH, '{hỏng');
    expect(await device(gh, a.store, 'A')()).toMatchObject({ status: 'error', kind: 'invalid-data' });
    expect(gh.puts()).toBe(0);
  });
});

describe('Hai điện thoại (T04 AC5 a–e)', () => {
  const setup = () => {
    const gh = fakeGitHub();
    const seed = [makeTree({ id: 'SR01' }), makeTree({ id: 'SR02' }), makeTree({ id: 'SR03' })];
    const photoBytesA = new Map<string, Uint8Array>();
    const A = memStore({ trees: structuredClone(seed) }, photoBytesA);
    const B = memStore({ trees: structuredClone(seed) });
    return { gh, A, B, syncA: device(gh, A.store, 'A'), syncB: device(gh, B.store, 'B'), photoBytesA };
  };
  const editTree = (m: ReturnType<typeof memStore>, id: string, label: string, by: string) =>
    m.set((s) => ({ ...s, trees: s.trees.map((t) => (t.id === id ? { ...t, label, updatedAt: clock(), updatedBy: by } : t)) }));

  it('(a) A sửa SR01, B sửa SR02 → cả hai máy thấy cả hai thay đổi', async () => {
    const { A, B, syncA, syncB } = setup();
    await syncA(); await syncB();
    editTree(A, 'SR01', 'Góc cổng', 'A');
    editTree(B, 'SR02', 'Gần giếng', 'B');
    await syncA(); await syncB(); await syncA();
    for (const m of [A, B]) expect(m.get().trees.map((t) => t.label)).toEqual(['Góc cổng', 'Gần giếng', 'SR03']);
  });

  it('(b) cả hai sửa SR03 → bản sửa sau thắng ở cả hai máy', async () => {
    const { A, B, syncA, syncB } = setup();
    editTree(A, 'SR03', 'A sửa trước', 'A');
    editTree(B, 'SR03', 'B sửa sau', 'B');
    await syncA(); await syncB(); await syncA();
    for (const m of [A, B]) expect(m.get().trees.find((t) => t.id === 'SR03')?.label).toBe('B sửa sau');
  });

  it('(c) A xóa nhật ký khi B offline → B đồng bộ xong nhật ký vẫn bị xóa', async () => {
    const { A, B, syncA, syncB } = setup();
    A.set((s) => ({ ...s, logs: [makeLog({ id: 'L1', targetId: 'SR01', date: '2026-11-24', updatedAt: clock() })] }));
    await syncA(); await syncB();
    expect(B.get().logs.map((l) => l.id)).toEqual(['L1']);
    A.set((s) => ({ ...s, logs: s.logs.map((l) => ({ ...l, deletedAt: clock(), updatedAt: clock(), updatedBy: 'A' })) }));
    await syncA();
    await syncB(); // B vừa có mạng lại, vẫn còn bản cũ chưa xóa
    expect(B.get().logs[0].deletedAt).toBeDefined();
    await syncA();
    expect(A.get().logs[0].deletedAt).toBeDefined();
  });

  it('(d) ảnh chụp ở A được tải lên, B nhận meta có remotePath và tải được nội dung', async () => {
    const { gh, A, B, syncA, syncB, photoBytesA } = setup();
    const photo = makePhoto({ id: 'P1', targetId: 'SR01', takenAt: '2026-11-25', updatedAt: clock() });
    photoBytesA.set('P1', new Uint8Array([1, 2, 3, 250]));
    A.set((s) => ({ ...s, photos: [photo] }));
    const r = await syncA();
    expect(r).toMatchObject({ status: 'ok', uploadedPhotos: 1 });
    await syncB();
    const meta = B.get().photos[0];
    expect(meta.remotePath).toBe(photoPath(photo));
    expect(await createGitHubClient(cfg, gh.fetchFn).getBytes(meta.remotePath!)).toEqual(new Uint8Array([1, 2, 3, 250]));
    expect(await syncA()).toMatchObject({ uploadedPhotos: 0 }); // không tải lại
  });

  it('(e) hai máy offline cùng thêm "SR16" → 2 cây riêng (2 UUID), báo trùng mã, không mất dữ liệu', async () => {
    const { A, B, syncA, syncB } = setup();
    A.set((s) => ({ ...s, trees: [...s.trees, makeTree({ id: 'uuid-a', code: 'SR16', label: 'Cây của A', updatedAt: clock() })] }));
    B.set((s) => ({ ...s, trees: [...s.trees, makeTree({ id: 'uuid-b', code: 'SR16', label: 'Cây của B', updatedAt: clock() })] }));
    await syncA(); await syncB(); await syncA();
    for (const m of [A, B]) {
      expect(m.get().trees.filter((t) => t.code === 'SR16').map((t) => t.label).sort()).toEqual(['Cây của A', 'Cây của B']);
      expect([...duplicateCodes(m.get().trees).keys()]).toEqual(['SR16']);
    }
  });
});

describe('createSyncScheduler (thời điểm đồng bộ, SPEC §6)', () => {
  const ok = { status: 'ok', pushed: true, pulled: 0, pushedChanges: 1, uploadedPhotos: 0, at: 'x' } as const;
  it('notifyChange → chạy sau 30 giây yên lặng (gộp nhiều thay đổi thành 1 lượt)', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => ok);
    const s = createSyncScheduler({ run, isOnline: () => true });
    s.notifyChange(); s.notifyChange();
    await vi.advanceTimersByTimeAsync(29_000);
    expect(run).not.toHaveBeenCalled();
    s.notifyChange();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(s.pendingChanges).toBe(0);
  });
  it('offline → không chạy, giữ hàng chờ', async () => {
    const run = vi.fn(async () => ok);
    const s = createSyncScheduler({ run, isOnline: () => false });
    s.notifyChange();
    expect(await s.syncNow()).toBeNull();
    expect(run).not.toHaveBeenCalled();
    expect(s.pendingChanges).toBe(1);
  });
  it('gọi syncNow khi đang chạy → không chạy song song, chạy thêm đúng 1 lượt sau', async () => {
    let resolve!: () => void;
    let calls = 0;
    const run = vi.fn(() => { calls += 1; return calls === 1 ? new Promise<typeof ok>((r) => { resolve = () => r(ok); }) : Promise.resolve(ok); });
    const s = createSyncScheduler({ run, isOnline: () => true });
    const p1 = s.syncNow();
    void s.syncNow(); void s.syncNow();
    expect(s.isRunning).toBe(true);
    resolve();
    await p1;
    expect(run).toHaveBeenCalledTimes(2);
  });
});
