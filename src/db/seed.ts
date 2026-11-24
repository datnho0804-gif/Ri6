import { nowUTC } from '../lib/date';
import type { Lot, Settings, Tree } from '../types/models';

export const DEFAULT_DATA_REPO = 'datnho0804-gif/Ri6-data';
export const DEFAULT_DATA_BRANCH = 'main';
export const LOT_A_ID = 'LOT_A';
export const LOT_A_INITIAL_COUNT = 50;
export const LOT_B_TREE_COUNT = 15;

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createInitialSettings(deviceId: string, appVersion: string): Settings {
  return {
    id: 'app',
    deviceId,
    deviceName: 'Thiết bị vườn Ri6',
    dataRepo: DEFAULT_DATA_REPO,
    dataBranch: DEFAULT_DATA_BRANCH,
    autoSync: true,
    seasonOverride: null,
    lastSeenVersion: appVersion,
  };
}

export function createInitialTrees(deviceId: string, timestamp = nowUTC()): Tree[] {
  const trees: Tree[] = [];
  for (let i = 1; i <= LOT_B_TREE_COUNT; i += 1) {
    const id = `SR${String(i).padStart(2, '0')}`;
    trees.push({
      id,
      lot: 'B',
      label: id,
      location: '',
      ageYears: null,
      stage: null,
      health: 'tot',
      needsPruning: false,
      diseaseWatch: false,
      updatedAt: timestamp,
      updatedBy: deviceId,
    });
  }
  return trees;
}

export function createInitialLotA(deviceId: string, timestamp = nowUTC()): Lot {
  return {
    id: LOT_A_ID,
    treeCount: LOT_A_INITIAL_COUNT,
    stage: null,
    updatedAt: timestamp,
    updatedBy: deviceId,
  };
}
