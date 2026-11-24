import type { ISOTime } from '../types/models';
import { convertLegacyBackup, isLegacyBackup, type LegacyBackup } from './legacyImport';
import { SYNC_COLLECTIONS, type SyncState } from './merge';

export const EXPORT_APP = 'so-tay-vuon-ri6';
export const EXPORT_SCHEMA_VERSION = 1;

/** File sao lưu JSON (SPEC M5). KHÔNG BAO GIỜ chứa Settings (token, API key). */
export interface ExportFile {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: ISOTime;
  appVersion: string;
  data: SyncState;
  /** Tùy chọn "kèm ảnh": `photo.id` → data URL (base64). */
  photoData?: Record<string, string>;
}

/** Tên khóa bí mật không được xuất hiện ở bất kỳ đâu trong file xuất. */
export const SECRET_KEYS = ['githubToken', 'geminiApiKey'] as const;

function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripSecrets) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !(SECRET_KEYS as readonly string[]).includes(k))
        .map(([k, v]) => [k, stripSecrets(v)]),
    ) as T;
  }
  return value;
}

export function buildExport(
  state: SyncState,
  opts: { exportedAt: ISOTime; appVersion: string; photoData?: Record<string, string> },
): ExportFile {
  const data = Object.fromEntries(SYNC_COLLECTIONS.map((k) => [k, stripSecrets(state[k])])) as unknown as SyncState;
  return {
    app: EXPORT_APP,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: opts.exportedAt,
    appVersion: opts.appVersion,
    data,
    ...(opts.photoData && { photoData: opts.photoData }),
  };
}

/** Tên file gợi ý: `so-tay-ri6-2026-11-25.json`. */
export function exportFileName(date: string): string {
  return `so-tay-ri6-${date}.json`;
}

export type ParsedImport =
  | { ok: true; kind: 'ri6'; data: SyncState; photoData?: Record<string, string> }
  | { ok: true; kind: 'legacy'; legacy: LegacyBackup }
  | { ok: false; error: string };

const isMeta = (r: unknown): boolean =>
  !!r && typeof r === 'object' && ['id', 'updatedAt', 'updatedBy'].every((k) => typeof (r as Record<string, unknown>)[k] === 'string');

/**
 * Đọc file JSON người dùng chọn. Nhận 2 định dạng:
 * - File của app này (`app = so-tay-vuon-ri6`).
 * - File sao lưu của app cũ `legacy/index.html` (chỉ thông tin cây + nhật ký).
 */
export function parseImportFile(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ' };
  }
  if (isLegacyBackup(raw)) return { ok: true, kind: 'legacy', legacy: raw };
  const f = raw as Partial<ExportFile>;
  if (!f || f.app !== EXPORT_APP || !f.data) return { ok: false, error: 'Không phải file sao lưu của Sổ Tay Vườn Ri6' };
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > EXPORT_SCHEMA_VERSION) {
    return { ok: false, error: 'File được tạo từ phiên bản app mới hơn — hãy cập nhật app trước khi nhập' };
  }
  const data = {} as Record<string, unknown[]>;
  for (const k of SYNC_COLLECTIONS) {
    const arr = (f.data as unknown as Record<string, unknown>)[k] ?? [];
    if (!Array.isArray(arr) || !arr.every(isMeta)) return { ok: false, error: `Dữ liệu "${k}" bị hỏng` };
    data[k] = stripSecrets(arr);
  }
  return { ok: true, kind: 'ri6', data: data as unknown as SyncState, ...(f.photoData && { photoData: f.photoData }) };
}

/** Chuyển kết quả đọc file thành `SyncState` để đưa vào `mergeState` (không ghi đè). */
export function importToSyncState(
  parsed: Extract<ParsedImport, { ok: true }>,
  ctx: Parameters<typeof convertLegacyBackup>[1],
): SyncState {
  return parsed.kind === 'ri6' ? parsed.data : convertLegacyBackup(parsed.legacy, ctx);
}
