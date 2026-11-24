/**
 * Hằng số nông học — NGUỒN DUY NHẤT (AGENTS §3, SPEC §3).
 * Máy tính, thẻ phác đồ, việc cần làm và prompt AI đều phải đọc từ đây.
 * Khoảng [min, max] tính theo ngày (đóng hai đầu).
 */
export type DayRange = readonly [number, number];

export const FARM = {
  place: 'xã Lộc Tấn, tỉnh Đồng Nai',
  region: 'Đông Nam Bộ',
  soil: 'đất đỏ bazan',
  irrigation: 'béc tưới gốc',
  variety: 'Ri6',
} as const;

/** Mốc sinh lý Ri6 (SPEC §3.2). */
export const RI6 = {
  /** Mắt cua → xổ nhụy. */
  budToFlower: [55, 57] as DayRange,
  /** Tưới nhấp 3–7 ngày đầu sau xổ nhụy. */
  dripWatering: [3, 7] as DayRange,
  /** Chặn đọt non + Canxi-Bo trong 30 ngày đầu. */
  shootControlUntil: 30,
  /** Chuyển NPK giàu Kali. */
  potassium: [55, 65] as DayRange,
  /** Lên cơm mạnh. */
  fleshFilling: [60, 65] as DayRange,
  /** Bắt đầu giảm đạm (≈ 4 tuần trước mốc thu sớm nhất). */
  reduceNitrogenFrom: 62,
  /** Thu hoạch. */
  harvest: [90, 105] as DayRange,
} as const;

/** pH đất đỏ bazan (SPEC §3.3). */
export const SOIL_PH = { min: 5.5, max: 6.5, inputMin: 3.0, inputMax: 9.0 } as const;

/**
 * Khoảng cách sau khi bón vôi/Dolomite (SPEC §3.3, M6) — lấy CẬN TRÊN cho an toàn.
 * - Hữu cơ / Trichoderma: ≥ 15 ngày.
 * - Urê/đạm amoni, lân: ≥ 10 ngày.
 */
export const LIME_GAP_DAYS = { organic: 15, nitrogenPhosphate: 10 } as const;

/** Nhắc kiểm tra lại sau phun thuốc / sâu bệnh (bước 5 phác đồ). */
export const RECHECK_AFTER_DAYS = [7, 14] as const;

/** Trạng thái ảnh tuần (SPEC M1): ok 0–5, sắp hạn 6–7, quá hạn ≥ 8 hoặc chưa có. */
export const PHOTO_STATUS_DAYS = { okMax: 5, dueSoonMax: 7 } as const;

/** Lượng nước béc tưới (SPEC §3.3). */
export const IRRIGATION = {
  lotA: { min: 20, max: 40, defaultLiters: 30 },
  lotB: { min: 150, max: 200, defaultLiters: 180 },
} as const;

/** Mùa vụ Đông Nam Bộ: khô T11–T4, mưa T5–T10. */
export const DRY_SEASON_MONTHS: readonly number[] = [11, 12, 1, 2, 3, 4];

/** Ảnh cây (DESIGN §5). */
export const IMAGE = {
  fullMaxEdge: 1600,
  thumbMaxEdge: 480,
  quality: 0.8,
  targetMaxBytes: 350 * 1024,
} as const;

/** Số mục nhật ký đưa vào prompt AI. */
export const PROMPT_RECENT_LOGS = 10;
