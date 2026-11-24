/** Dữ liệu mẫu cho unit test trong `src/lib` (không dùng trong app). */
import type { Log, Lot, Photo, Tree } from '../types/models';

export const T0 = '2026-11-24T00:00:00.000Z';
export const DEV = 'device-a';

export function makeTree(over: Partial<Tree> & { id: string }): Tree {
  return {
    code: over.id,
    lot: 'B',
    label: over.id,
    location: '',
    ageYears: null,
    stage: null,
    health: 'tot',
    needsPruning: false,
    diseaseWatch: false,
    updatedAt: T0,
    updatedBy: DEV,
    ...over,
  };
}

export function makeLog(over: Partial<Log> & { id: string; targetId: string; date: string }): Log {
  return { type: 'khac', note: '', updatedAt: T0, updatedBy: DEV, ...over };
}

export function makeLot(over: Partial<Lot> = {}): Lot {
  return { id: 'LOT_A', treeCount: 50, stage: null, updatedAt: T0, updatedBy: DEV, ...over };
}

export function makePhoto(over: Partial<Photo> & { id: string; targetId: string; takenAt: string }): Photo {
  return { kind: 'weekly', width: 1600, height: 1200, bytes: 250_000, updatedAt: T0, updatedBy: DEV, ...over };
}

/** Sinh id tuần tự: id-1, id-2… */
export function seqIds(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
