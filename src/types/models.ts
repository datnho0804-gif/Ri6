export type ISODate = string; // 'YYYY-MM-DD' (Asia/Ho_Chi_Minh)
export type ISOTime = string; // ISO 8601 UTC

export interface SyncMeta {
  id: string;
  updatedAt: ISOTime;
  updatedBy: string; // deviceId
  deletedAt?: ISOTime;
}

export type Stage =
  | 'kien-thiet'
  | 'coi-dot'
  | 'xiet-nuoc-lam-bong'
  | 'mat-cua'
  | 'xo-nhuy'
  | 'nuoi-trai'
  | 'thu-hoach'
  | 'phuc-hoi';

export type TreeHealth = 'tot' | 'theo-doi' | 'benh';

export interface Tree extends SyncMeta {
  // id: 'SR01'..'SR15'
  lot: 'B';
  label: string;
  location: string;
  ageYears: 3 | 4 | 5 | null;
  stage: Stage | null;
  health: TreeHealth;
  needsPruning: boolean;
  diseaseWatch: boolean;
  budDate?: ISODate;
  flowerDate?: ISODate;
  note?: string;
}

export interface Lot extends SyncMeta {
  // id: 'LOT_A'
  treeCount: number;
  stage: Stage | null;
  note?: string;
}

export type LogType =
  | 'bon-phan'
  | 'phun-thuoc'
  | 'cat-tia'
  | 'sau-benh'
  | 'lam-bong'
  | 'tuoi'
  | 'ai'
  | 'khac';

export interface Log extends SyncMeta {
  targetId: string;
  date: ISODate;
  type: LogType;
  note: string;
  activeIngredient?: string;
  phiDays?: number;
}

export type PhotoKind =
  | 'weekly'
  | 'prune-overview'
  | 'prune-under'
  | 'prune-closeup'
  | 'disease';

export interface Photo extends SyncMeta {
  targetId: string;
  takenAt: ISODate;
  kind: PhotoKind;
  width: number;
  height: number;
  bytes: number;
  remotePath?: string;
}

export interface PhotoBlobRecord {
  id: string; // Matches Photo.id
  blob: Blob;
}

export type Season = 'kho' | 'mua';

/**
 * Local-only settings stored in Dexie `settings` table (never localStorage, never exported/synced).
 */
export interface Settings {
  id: 'app';
  deviceId: string;
  deviceName: string;
  githubToken?: string;
  dataRepo: string;
  dataBranch: string;
  autoSync: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  seasonOverride?: Season | null;
  lastSeenVersion?: string;
}

export type TabId = 'overview' | 'trees' | 'pruning' | 'reference';
export type ViewId = TabId | 'settings';
