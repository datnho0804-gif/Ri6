import type { ISODate, Season } from '../types/models';
import { DRY_SEASON_MONTHS } from './agronomy';

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
