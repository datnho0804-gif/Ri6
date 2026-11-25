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
  // id: 'SR01'..'SR03' on initial seed (SPEC 1.2; bản cũ seed SR01..SR15); UUID for trees added later (SPEC 1.1)
  code: string;
  lot: 'A' | 'B';
  label: string;
  location: string;
  ageYears: number | null;
  stage: Stage | null;
  health: TreeHealth;
  needsPruning: boolean;
  diseaseWatch: boolean;
  budDate?: ISODate;
  flowerDate?: ISODate;
  fruitCount?: number;
  fruitCountDate?: ISODate;
  fruitLimit?: number;
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
  | 'do-ph'
  | 'ai'
  | 'khac';

export type FertKind =
  | 'voi-dolomite'
  | 'huu-co-trichoderma'
  | 'dam-ure'
  | 'lan'
  | 'npk'
  | 'khac';

export interface Log extends SyncMeta {
  targetId: string;
  date: ISODate;
  type: LogType;
  note: string;
  activeIngredient?: string;
  phiDays?: number;
  fertilizerKind?: FertKind;
  soilPh?: number;
  batchId?: string;
  /** [1.2] Vật tư đã dùng — `SupplyItem.id` trong `src/lib/supplies.ts`. */
  supplyId?: string;
  /** [1.2] Giá chủ vườn thực trả (VNĐ cho 1 đơn vị đóng gói) — app "học" giá thật từ đây. */
  priceVnd?: number;
}

export type TaskSource = 'rule' | 'manual' | 'ai';

export interface Task extends SyncMeta {
  title?: string;
  targetId?: string;
  dueDate?: ISODate;
  done: boolean;
  snoozeUntil?: ISODate;
  source: TaskSource;
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

/** [1.2] Nhóm ghi nhớ của trợ lý AI. */
export type AiMemoryCategory =
  | 'kinh-nghiem' // kinh nghiệm canh tác của vườn
  | 'so-thich' // thói quen / sở thích của chủ vườn
  | 'phan-ung' // cây phản ứng với phân / thuốc
  | 'vat-tu' // vật tư, giá, nơi mua
  | 'khac';

/**
 * [1.2] Ghi nhớ của trợ lý AI (SPEC M7.1). Đồng bộ lên repo như dữ liệu vườn.
 * Chỉ mục `approved` mới được nạp vào prompt. KHÔNG bao giờ chứa token / API key.
 */
export interface AiMemory extends SyncMeta {
  category: AiMemoryCategory;
  content: string;
  /** Mã cây / `LOT_A` liên quan; trống = cả vườn. */
  targetIds?: string[];
  source: 'ai' | 'manual' | 'log';
  confidence?: 'thap' | 'vua' | 'cao';
  approved: boolean;
  createdAt: ISOTime;
}

export interface PhotoBlobRecord {
  id: string; // Matches Photo.id
  blob: Blob;
}

export interface AiChatActionSnapshot {
  title: string;
  dueInDays: number;
  targetId?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: ISOTime;
  photoIds?: string[];
  /** [1.2] Preserved locally when reopening saved AI conversations. */
  confidence?: 'thap' | 'vua' | 'cao' | null;
  actions?: AiChatActionSnapshot[];
}

/**
 * Local-only AI conversation history stored in Dexie `aiChats` table (never synced, max 50).
 */
export interface AiChat {
  id: string;
  title: string;
  targetId?: string;
  messages: AiChatMessage[];
  createdAt: ISOTime;
  updatedAt: ISOTime;
}

export type Season = 'kho' | 'mua';

export interface NotifySettings {
  enabled: boolean;
  lastNotifiedAt?: ISOTime;
  lastKeys: string[];
}

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
  notify?: NotifySettings;
  geminiSchemaUnsupported?: string[];
  hapticsEnabled?: boolean;
  seededAt?: ISOTime;
  lastSeenVersion?: string;
  lastRepoSizeKB?: number;
  lastRepoCheckedAt?: ISOTime;
}

export type TabId = 'overview' | 'trees' | 'pruning' | 'reference';
export type ViewId = TabId | 'settings' | 'agenda';
