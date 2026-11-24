import type { ISOTime, Photo } from '../../types/models';
import { diffCounts, emptySyncState, mergeById, mergeState, SYNC_COLLECTIONS, type SyncState } from '../merge';
import { bytesToBase64, utf8ToBase64 } from './base64';
import { SyncError, type SyncErrorKind } from './errors';
import type { GitHubClient } from './github';
import { parseState, photoPath, serializeState, STATE_PATH } from './stateFile';

/**
 * Cầu nối dữ liệu cục bộ — **Antigravity hiện thực bằng Dexie** (`src/db/`) và truyền vào.
 * Engine không biết Dexie, không dùng window/document/localStorage → chạy được trong Service Worker.
 */
export interface SyncStore {
  loadState(): Promise<SyncState>;
  /** Ghi đè các bản ghi đã merge (bulkPut theo id). */
  saveState(state: SyncState): Promise<void>;
  /** Ảnh chưa có `remotePath` + dữ liệu nhị phân + mime. */
  pendingPhotoUploads(): Promise<Array<{ photo: Photo; bytes: Uint8Array; mime: string }>>;
}

export interface SyncDeps {
  client: GitHubClient;
  store: SyncStore;
  deviceId: string;
  deviceName: string;
  now: () => ISOTime;
  /** Mặc định 3 (SPEC §6 bước 6). */
  maxRetries?: number;
  /** Backoff giữa các lần thử lại khi lệch sha. */
  sleep?: (ms: number) => Promise<void>;
}

export type SyncResult =
  | { status: 'ok'; pushed: boolean; pulled: number; pushedChanges: number; uploadedPhotos: number; at: ISOTime }
  | { status: 'error'; kind: SyncErrorKind; message: string; at: ISOTime };

const countChanges = (from: SyncState, to: SyncState) => {
  const c = diffCounts(from, to);
  return SYNC_COLLECTIONS.reduce((n, k) => n + c[k].added + c[k].updated, 0);
};

/**
 * Một lượt đồng bộ (SPEC §6 bước 1–6):
 * 1) tải ảnh chưa có `remotePath` (bất biến) → gắn `remotePath` vào meta;
 * 2) đọc `data/state.json` + sha (404 = rỗng);
 * 3) merge(local, remote) — LWW theo bản ghi, tombstone;
 * 4) ghi kết quả về máy nếu khác bản cục bộ;
 * 5) nếu khác bản trên repo → PUT kèm sha;
 * 6) lệch sha → đọc lại từ bước 2, tối đa `maxRetries` lần, có backoff.
 * Không ném lỗi: trả về `{status:'error', kind}` để UI hiện trạng thái.
 */
export async function syncOnce(deps: SyncDeps): Promise<SyncResult> {
  const { client, store } = deps;
  const maxRetries = deps.maxRetries ?? 3;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  try {
    // 1) Ảnh
    let uploaded = 0;
    const pending = await store.pendingPhotoUploads();
    if (pending.length) {
      const local = await store.loadState();
      const stamped: Photo[] = [];
      for (const { photo, bytes, mime } of pending) {
        const path = photoPath(photo, mime);
        await client.putImmutable(path, bytesToBase64(bytes), `photo(${deps.deviceName}): ${photo.targetId} ${photo.takenAt}`);
        stamped.push({ ...photo, remotePath: path, updatedAt: deps.now(), updatedBy: deps.deviceId });
        uploaded += 1;
      }
      await store.saveState({ ...local, photos: mergeById(local.photos, stamped) });
    }

    // 2–6) state.json
    for (let attempt = 0; ; attempt += 1) {
      const local = await store.loadState();
      const remoteFile = await client.getText(STATE_PATH);
      const remote = remoteFile ? parseState(remoteFile.text) : emptySyncState();
      const merged = mergeState(local, remote);

      // 4) Bản ghi mới/được cập nhật từ repo → ghi về máy.
      const pulled = countChanges(local, merged);
      if (pulled > 0) await store.saveState(merged);

      // 5) Bản ghi repo chưa có/cũ hơn → cần đẩy lên.
      const pushedChanges = countChanges(remote, merged);
      if (pushedChanges === 0) return { status: 'ok', pushed: false, pulled, pushedChanges: 0, uploadedPhotos: uploaded, at: deps.now() };

      try {
        await client.putBase64(STATE_PATH, utf8ToBase64(serializeState(merged)), `sync(${deps.deviceName}): ${pushedChanges} thay đổi`, remoteFile?.sha);
        return { status: 'ok', pushed: true, pulled, pushedChanges, uploadedPhotos: uploaded, at: deps.now() };
      } catch (e) {
        if (e instanceof SyncError && e.kind === 'conflict' && attempt < maxRetries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw e;
      }
    }
  } catch (e) {
    const err = e instanceof SyncError ? e : new SyncError('unknown', e instanceof Error ? e.message : String(e));
    return { status: 'error', kind: err.kind, message: err.message, at: deps.now() };
  }
}
