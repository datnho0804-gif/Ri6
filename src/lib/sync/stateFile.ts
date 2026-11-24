import type { Photo } from '../../types/models';
import { EXPORT_SCHEMA_VERSION } from '../exportImport';
import { SYNC_COLLECTIONS, emptySyncState, mergeState, type SyncState } from '../merge';
import { SyncError } from './errors';

/** Đường dẫn trong repo dữ liệu (SPEC §6). */
export const STATE_PATH = 'data/state.json';

/** Đường dẫn ảnh: `photos/<targetId>/<YYYY-MM-DD>_<photoId>.<ext>` — bất biến. */
export function photoPath(photo: Pick<Photo, 'id' | 'targetId' | 'takenAt'>, mime = 'image/webp'): string {
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
  const safeTarget = photo.targetId.replace(/[^\w-]/g, '_');
  return `photos/${safeTarget}/${photo.takenAt}_${photo.id}.${ext}`;
}

/** Ghi `state.json`: thụt lề 2, mảng sắp theo id (mergeState đã sắp) → diff ổn định. */
export function serializeState(state: SyncState): string {
  const sorted = mergeState(state, emptySyncState());
  return `${JSON.stringify({ schemaVersion: EXPORT_SCHEMA_VERSION, ...sorted }, null, 2)}\n`;
}

/** Đọc `state.json` từ repo; hỏng → `invalid-data` (KHÔNG ghi đè dữ liệu người dùng). */
export function parseState(text: string): SyncState {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new SyncError('invalid-data', 'state.json trên repo không phải JSON hợp lệ');
  }
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > EXPORT_SCHEMA_VERSION) {
    throw new SyncError('invalid-data', 'Dữ liệu trên repo do phiên bản app mới hơn ghi — hãy cập nhật app');
  }
  const out = emptySyncState() as unknown as Record<string, unknown[]>;
  for (const k of SYNC_COLLECTIONS) {
    const arr = raw[k] ?? [];
    if (!Array.isArray(arr) || !arr.every((r) => r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string')) {
      throw new SyncError('invalid-data', `state.json: mảng "${k}" bị hỏng`);
    }
    out[k] = arr;
  }
  return out as unknown as SyncState;
}
