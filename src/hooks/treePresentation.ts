import { formatDateVN } from '../lib/date';
import { formatShortDateVN } from '../lib/format';
import { phiEnd } from '../lib/phi';
import type { Milestone } from '../lib/ri6';
import { seasonLabel } from '../lib/season';
import type { ISODate, Log, Photo, Season } from '../types/models';

export const SEASON_BANNER_COPY: Record<
  Season,
  { label: string; monthsText: string; summary: string; recommendations: readonly string[] }
> = {
  kho: {
    label: seasonLabel('kho'),
    monthsText: 'tháng 11 – tháng 4',
    summary: 'Giữ ẩm gốc bằng béc tưới, soi nhện đỏ & rầy xanh; Lô B chuẩn bị xiết nước làm bông.',
    recommendations: [
      'Lô A (cây kiến thiết): tưới 20–40 L/gốc mỗi 2–3 ngày, tủ gốc 10–15 cm (cách cổ rễ 20–30 cm).',
      'Lô B (nuôi trái / làm bông): kiểm tra ẩm độ đất đỏ bazan, bật béc đều để tránh sốc nước rụng trái.',
      'Mùa khô dễ bùng nhện đỏ, rầy xanh — kiểm tra mặt dưới lá và cơi đọt non thường xuyên.',
    ],
  },
  mua: {
    label: seasonLabel('mua'),
    monthsText: 'tháng 5 – tháng 10',
    summary: 'Ưu tiên thoát nước rãnh, phòng nấm Phytophthora & thối trái; hạn chế bón phân khi mưa lớn.',
    recommendations: [
      'Khơi thông rãnh thoát nước, không để úng quanh cổ rễ trên nền đất đỏ bazan.',
      'Kiểm tra thân và cổ rễ phát hiện sớm dấu hiệu xì mủ (Phytophthora), cắt tỉa lòng tán cho thoáng gió.',
      'Đo pH đất (chuẩn 5,5–6,5); nếu bón Vôi/Dolomite phải giữ khoảng cách an toàn với hữu cơ và đạm/lân.',
    ],
  },
};

/**
 * Formats a Milestone returned by src/lib/ri6.ts into concise Vietnamese date range text.
 */
export function formatMilestoneDates(m: Milestone, withYear = false): string {
  const fmt = withYear ? formatDateVN : formatShortDateVN;
  const same = m.earliest === m.latest;
  if (m.kind === 'until') {
    return same ? `Đến ${fmt(m.earliest)}` : `Đến ${fmt(m.earliest)} – ${fmt(m.latest)}`;
  }
  if (m.kind === 'from') {
    return same ? `Từ ${fmt(m.earliest)}` : `Từ ${fmt(m.earliest)} – ${fmt(m.latest)}`;
  }
  return same ? fmt(m.earliest) : `${fmt(m.earliest)} – ${fmt(m.latest)}`;
}

/**
 * Finds the latest active spray PHI end date (using src/lib/phi.ts `phiEnd`) for display alongside `phiWarning`.
 */
export function latestPhiSprayEnd(
  logs: readonly Log[],
  targetId: string,
): { endDate: ISODate; log: Log } | null {
  let best: { endDate: ISODate; log: Log } | null = null;
  for (const log of logs) {
    if (log.deletedAt || log.targetId !== targetId || log.type !== 'phun-thuoc') continue;
    const endDate = phiEnd(log);
    if (!endDate) continue;
    if (!best || endDate > best.endDate) {
      best = { endDate, log };
    }
  }
  return best;
}

/**
 * Latest active weekly Photo record by targetId (used to resolve thumbnail URLs alongside photoStatus).
 */
export function getLatestWeeklyPhotoRecords(photos: readonly Photo[]): Map<string, Photo> {
  const map = new Map<string, Photo>();
  for (const p of photos) {
    if (p.deletedAt || p.kind !== 'weekly') continue;
    const prev = map.get(p.targetId);
    if (
      !prev ||
      p.takenAt > prev.takenAt ||
      (p.takenAt === prev.takenAt && p.updatedAt > prev.updatedAt)
    ) {
      map.set(p.targetId, p);
    }
  }
  return map;
}
