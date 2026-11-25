import { formatDateVN } from '../lib/date';
import { formatShortDateVN } from '../lib/format';
import { phiEnd } from '../lib/phi';
import type { Milestone } from '../lib/ri6';
import { SEASON_ADVICE } from '../lib/season';
import type { ISODate, Log, Photo } from '../types/models';

export const SEASON_BANNER_COPY = SEASON_ADVICE;

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
