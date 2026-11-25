import { nowUTC } from '../lib/date';
import type { Lot, Settings, Tree } from '../types/models';

export const DEFAULT_DATA_REPO = 'datnho0804-gif/Ri6-data';
export const DEFAULT_DATA_BRANCH = 'main';
export const LOT_A_ID = 'LOT_A';

// SPEC 1.1 (T01 AC6): initial tree counts live exclusively in these two seed constants
export const INITIAL_INDIVIDUAL_TREES = 15;
export const INITIAL_LOT_A_COUNT = 50;

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createInitialSettings(deviceId: string, appVersion: string): Settings {
  const shortTag = deviceId.replace(/-/g, '').slice(-4).toUpperCase() || '0000';
  return {
    id: 'app',
    deviceId,
    deviceName: `Thiết bị Ri6-${shortTag}`,
    dataRepo: DEFAULT_DATA_REPO,
    dataBranch: DEFAULT_DATA_BRANCH,
    autoSync: true,
    seasonOverride: null,
    notify: {
      enabled: false,
      lastKeys: [],
    },
    geminiSchemaUnsupported: [],
    hapticsEnabled: true,
    lastSeenVersion: appVersion,
  };
}

export function createInitialTrees(deviceId: string, timestamp = nowUTC()): Tree[] {
  const trees: Tree[] = [];
  for (let i = 1; i <= INITIAL_INDIVIDUAL_TREES; i += 1) {
    const code = `SR${String(i).padStart(2, '0')}`;
    trees.push({
      id: code,
      code,
      lot: 'B',
      label: code,
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
    treeCount: INITIAL_LOT_A_COUNT,
    stage: null,
    updatedAt: timestamp,
    updatedBy: deviceId,
  };
}
