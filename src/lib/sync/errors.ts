/** Loại lỗi đồng bộ — UI hiện "Lỗi: token / quyền / mạng" theo `kind` (SPEC §6). */
export type SyncErrorKind =
  | 'auth' // 401: token sai/hết hạn
  | 'forbidden' // 403: thiếu quyền Contents write
  | 'rate-limit' // 403/429: hết hạn mức API
  | 'not-found' // 404: repo/nhánh không tồn tại hoặc token không thấy repo
  | 'conflict' // 409/422 lệch sha — đã thử lại tối đa
  | 'network' // mất mạng, timeout
  | 'invalid-data' // state.json trên repo hỏng
  | 'config' // chưa nhập token/repo
  | 'unknown';

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  readonly status?: number;
  constructor(kind: SyncErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'SyncError';
    this.kind = kind;
    this.status = status;
  }
}

/** Câu thông báo tiếng Việt ngắn cho header / Toast. */
export const SYNC_ERROR_LABEL: Record<SyncErrorKind, string> = {
  auth: 'Lỗi token: token sai hoặc đã hết hạn',
  forbidden: 'Lỗi quyền: token chưa có quyền ghi vào repo dữ liệu',
  'rate-limit': 'GitHub tạm giới hạn số lần gọi — thử lại sau ít phút',
  'not-found': 'Không thấy repo dữ liệu — kiểm tra tên repo và quyền của token',
  conflict: 'Có máy khác đang ghi cùng lúc — sẽ thử lại',
  network: 'Lỗi mạng: chưa kết nối được GitHub',
  'invalid-data': 'Dữ liệu trên repo bị hỏng — không ghi đè, cần kiểm tra',
  config: 'Chưa cài đặt đồng bộ (token / repo)',
  unknown: 'Lỗi đồng bộ không xác định',
};

export function errorFromStatus(status: number, headers?: Headers): SyncError {
  if (status === 401) return new SyncError('auth', SYNC_ERROR_LABEL.auth, status);
  if (status === 429 || (status === 403 && headers?.get('x-ratelimit-remaining') === '0')) {
    return new SyncError('rate-limit', SYNC_ERROR_LABEL['rate-limit'], status);
  }
  if (status === 403) return new SyncError('forbidden', SYNC_ERROR_LABEL.forbidden, status);
  if (status === 404) return new SyncError('not-found', SYNC_ERROR_LABEL['not-found'], status);
  if (status === 409 || status === 422) return new SyncError('conflict', SYNC_ERROR_LABEL.conflict, status);
  return new SyncError('unknown', `${SYNC_ERROR_LABEL.unknown} (HTTP ${status})`, status);
}
