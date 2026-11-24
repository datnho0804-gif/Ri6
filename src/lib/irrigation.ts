import { IRRIGATION } from './agronomy';

export interface IrrigationInput {
  aLiters: number;
  aCount: number;
  bLiters: number;
  bCount: number;
  /** Số lần tưới mỗi tuần (tùy chọn). */
  perWeek?: number;
}

export interface IrrigationResult {
  lotA: { liters: number; m3: number };
  lotB: { liters: number; m3: number };
  totalM3: number;
  weeklyM3?: number;
  /** Cảnh báo ngoài khoảng khuyến cáo — KHÔNG chặn tính. */
  warnings: { lot: 'A' | 'B'; message: string }[];
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Tính m³ nước béc tưới (SPEC M4, T03 AC4). Ném lỗi khi số nhập âm/không hợp lệ. */
export function irrigation(i: IrrigationInput): IrrigationResult {
  for (const [k, v] of Object.entries(i)) {
    if (v !== undefined && (!Number.isFinite(v) || v < 0)) throw new Error(`Giá trị "${k}" không hợp lệ`);
  }
  const aL = i.aLiters * i.aCount;
  const bL = i.bLiters * i.bCount;
  const total = r3((aL + bL) / 1000);
  const warnings: IrrigationResult['warnings'] = [];
  const { lotA, lotB } = IRRIGATION;
  if (i.aLiters < lotA.min || i.aLiters > lotA.max) {
    warnings.push({ lot: 'A', message: `Lô A khuyến cáo ${lotA.min}–${lotA.max} L/cây/lần (đang nhập ${i.aLiters} L)` });
  }
  if (i.bLiters < lotB.min || i.bLiters > lotB.max) {
    warnings.push({ lot: 'B', message: `Lô B khuyến cáo ${lotB.min}–${lotB.max} L/cây khi nuôi trái (đang nhập ${i.bLiters} L)` });
  }
  return {
    lotA: { liters: aL, m3: r3(aL / 1000) },
    lotB: { liters: bL, m3: r3(bL / 1000) },
    totalM3: total,
    ...(i.perWeek !== undefined && { weeklyM3: r3(total * i.perWeek) }),
    warnings,
  };
}

/** Quy tắc đặt béc (SPEC §3.3) — hiển thị cạnh máy tính. */
export const SPRINKLER_RULES = {
  common: 'Tuyệt đối không đặt béc phun thẳng vào cổ rễ hoặc thân (tránh nấm Phytophthora).',
  lotA: '1 béc/cây, cách gốc 40–50 cm, bán kính phun 0,5–0,8 m, 20–40 L/cây/lần.',
  lotB: '2–3 béc đối xứng, cách gốc 1–1,5 m, phun phủ tới rìa tán; van khóa riêng để xiết nước làm bông.',
} as const;
