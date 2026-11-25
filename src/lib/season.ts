import type { ISODate, Season } from '../types/models';
import { DRY_SEASON_MONTHS, IRRIGATION, LIME_GAP_DAYS, MULCH, SOIL_PH } from './agronomy';

/** Mùa theo tháng của ngày `YYYY-MM-DD` (giờ VN): khô T11–T4, mưa T5–T10. */
export function seasonOf(date: ISODate): Season {
  const month = Number(date.slice(5, 7));
  return DRY_SEASON_MONTHS.includes(month) ? 'kho' : 'mua';
}

/** Mùa đang dùng: ưu tiên lựa chọn tay của người dùng, nếu không thì theo tháng. */
export function effectiveSeason(date: ISODate, override?: Season | null): Season {
  return override ?? seasonOf(date);
}

export function seasonLabel(season: Season): string {
  return season === 'kho' ? 'Mùa khô' : 'Mùa mưa';
}

const n = (v: number) => String(v).replace('.', ',');
const r = (x: readonly [number, number]) => `${n(x[0])}–${n(x[1])}`;

export interface SeasonAdvice {
  label: string;
  monthsText: string;
  /** Một câu tóm tắt cho banner. */
  summary: string;
  /** Khuyến cáo tối thiểu SPEC §3.4 — đủ, đúng thứ tự, số liệu đọc từ agronomy.ts. */
  recommendations: readonly string[];
}

/**
 * Khuyến cáo theo mùa (SPEC §3.4) — nguồn duy nhất cho banner Tổng quan và prompt AI.
 * Thay cho phần chữ ghi cứng ở `src/hooks/treePresentation.ts`.
 */
export const SEASON_ADVICE: Record<Season, SeasonAdvice> = {
  kho: {
    label: seasonLabel('kho'),
    monthsText: 'tháng 11 – tháng 4',
    summary: 'Tưới theo lịch béc, giữ lớp tủ gốc; soi nhện đỏ & rầy xanh; Lô B xiết nước làm bông khi đủ cơi đọt.',
    recommendations: [
      `Tưới theo lịch béc (Lô A ${IRRIGATION.lotA.min}–${IRRIGATION.lotA.max} L/cây/lần); giữ lớp tủ gốc dày ${r(MULCH.thicknessCm)} cm, chừa cách gốc ${r(MULCH.gapFromTrunkCm)} cm.`,
      'Xiết nước làm bông cho Lô B — chỉ với cây đã đủ cơi đọt.',
      'Soi nhện đỏ và rầy xanh (mặt dưới lá, đọt non) — khô nóng làm chúng bùng phát.',
      'Không để béc phun vào cổ rễ hoặc thân cây.',
    ],
  },
  mua: {
    label: seasonLabel('mua'),
    monthsText: 'tháng 5 – tháng 10',
    summary: 'Khơi rãnh thoát nước, kiểm tra xì mủ gốc mỗi tuần; bón vôi đầu mùa rồi mới bón hữu cơ + Trichoderma.',
    recommendations: [
      'Khơi rãnh thoát nước, không để nước đọng quanh gốc.',
      'Kiểm tra xì mủ gốc (Phytophthora) mỗi tuần.',
      `Bón vôi/Dolomite đầu mùa (pH mục tiêu ${n(SOIL_PH.min)}–${n(SOIL_PH.max)}); sau ≥ ${LIME_GAP_DAYS.organic} ngày mới bón hữu cơ + Trichoderma.`,
      'Theo dõi cháy lá và nấm hồng khi ẩm độ cao.',
      'Cắt tỉa sau thu hoạch, làm vào ngày nắng ráo.',
    ],
  },
};
