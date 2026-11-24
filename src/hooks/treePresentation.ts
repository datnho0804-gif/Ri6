import { RI6 } from '../lib/agronomy';
import { addDays } from '../lib/date';
import { seasonLabel } from '../lib/season';
import type { ISODate, Log, Photo, Season, Tree } from '../types/models';

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

export interface SimpleRi6Row {
  key: string;
  label: string;
  from: ISODate;
  to?: ISODate;
  note: string;
}

/**
 * UI display rows for Ri6 milestones derived directly from src/lib/agronomy.ts (RI6).
 */
export function buildRi6PreviewRows(tree: Pick<Tree, 'budDate' | 'flowerDate'>): SimpleRi6Row[] {
  let flowerFrom: ISODate;
  let flowerTo: ISODate | undefined;
  const rows: SimpleRi6Row[] = [];

  if (tree.flowerDate) {
    flowerFrom = tree.flowerDate;
  } else if (tree.budDate) {
    flowerFrom = addDays(tree.budDate, RI6.budToFlower[0]);
    flowerTo = addDays(tree.budDate, RI6.budToFlower[1]);
    rows.push({
      key: 'xo-nhuy',
      label: 'Dự kiến xổ nhụy',
      from: flowerFrom,
      to: flowerTo,
      note: `${RI6.budToFlower[0]}–${RI6.budToFlower[1]} ngày sau mắt cua`,
    });
  } else {
    return [];
  }

  const endBase = flowerTo ?? flowerFrom;
  rows.push(
    {
      key: 'tuoi-nhap',
      label: 'Tưới nhấp đầu vụ',
      from: addDays(flowerFrom, RI6.dripWatering[0]),
      to: addDays(endBase, RI6.dripWatering[1]),
      note: 'Tưới nhấp giữ ẩm nhẹ sau xổ nhụy',
    },
    {
      key: 'chan-dot',
      label: 'Chặn đọt non & Canxi-Bo',
      from: flowerFrom,
      to: addDays(endBase, RI6.shootControlUntil),
      note: `${RI6.shootControlUntil} ngày đầu sau xổ nhụy`,
    },
    {
      key: 'kali',
      label: 'Chuyển NPK giàu Kali',
      from: addDays(flowerFrom, RI6.potassium[0]),
      to: addDays(endBase, RI6.potassium[1]),
      note: `Ngày ${RI6.potassium[0]}–${RI6.potassium[1]} sau xổ nhụy`,
    },
    {
      key: 'len-com',
      label: 'Lên cơm mạnh',
      from: addDays(flowerFrom, RI6.fleshFilling[0]),
      to: addDays(endBase, RI6.fleshFilling[1]),
      note: 'Hạn chế tưới thừa nước gây sượng cơm',
    },
    {
      key: 'giam-dam',
      label: 'Bắt đầu giảm đạm',
      from: addDays(flowerFrom, RI6.reduceNitrogenFrom),
      note: 'Khoảng 4 tuần trước mốc thu sớm nhất',
    },
    {
      key: 'thu-hoach',
      label: 'Thu hoạch dự kiến',
      from: addDays(flowerFrom, RI6.harvest[0]),
      to: addDays(endBase, RI6.harvest[1]),
      note: `Ri6 tiêu chuẩn ${RI6.harvest[0]}–${RI6.harvest[1]} ngày sau xổ nhụy`,
    },
  );
  return rows;
}

export interface TreePhiDisplay {
  phiEndDate: ISODate;
  logDate: ISODate;
  activeIngredient: string;
  phiDays: number;
  isActiveToday: boolean;
  conflictsHarvest: boolean;
}

/**
 * UI display summary for active PHI spray logs on a tree (gracefully ignores legacy logs without phiDays).
 */
export function getTreePhiDisplay(
  tree: Pick<Tree, 'id' | 'flowerDate' | 'budDate'>,
  logs: readonly Log[],
  today: ISODate,
): TreePhiDisplay | null {
  let latest: TreePhiDisplay | null = null;

  let earliestHarvest: ISODate | null = null;
  if (tree.flowerDate) {
    earliestHarvest = addDays(tree.flowerDate, RI6.harvest[0]);
  } else if (tree.budDate) {
    earliestHarvest = addDays(tree.budDate, RI6.budToFlower[0] + RI6.harvest[0]);
  }

  for (const log of logs) {
    if (log.deletedAt || log.targetId !== tree.id || log.type !== 'phun-thuoc') continue;
    if (typeof log.phiDays !== 'number' || log.phiDays <= 0) continue;
    const phiEndDate = addDays(log.date, log.phiDays);
    if (!latest || phiEndDate > latest.phiEndDate) {
      latest = {
        phiEndDate,
        logDate: log.date,
        activeIngredient: log.activeIngredient?.trim() || 'chưa rõ',
        phiDays: log.phiDays,
        isActiveToday: phiEndDate > today,
        conflictsHarvest: earliestHarvest !== null && phiEndDate > earliestHarvest,
      };
    }
  }
  return latest;
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
