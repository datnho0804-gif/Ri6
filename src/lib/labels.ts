import type { FertKind, LogType, PhotoKind, Stage, TreeHealth } from '../types/models';

/** Nhãn tiếng Việt cho các kiểu liệt kê — dùng chung cho UI, prompt AI, xuất dữ liệu. */
export const STAGE_LABEL: Record<Stage, string> = {
  'kien-thiet': 'Kiến thiết cơ bản',
  'coi-dot': 'Đi cơi đọt',
  'xiet-nuoc-lam-bong': 'Xiết nước làm bông',
  'mat-cua': 'Ra mắt cua',
  'xo-nhuy': 'Xổ nhụy',
  'nuoi-trai': 'Nuôi trái',
  'thu-hoach': 'Thu hoạch',
  'phuc-hoi': 'Phục hồi sau thu hoạch',
};

export const HEALTH_LABEL: Record<TreeHealth, string> = {
  tot: 'Tốt',
  'theo-doi': 'Theo dõi',
  benh: 'Bệnh',
};

export const LOG_TYPE_LABEL: Record<LogType, string> = {
  'bon-phan': 'Bón phân',
  'phun-thuoc': 'Phun thuốc',
  'cat-tia': 'Cắt tỉa',
  'sau-benh': 'Sâu bệnh',
  'lam-bong': 'Làm bông',
  tuoi: 'Tưới',
  'do-ph': 'Đo pH đất',
  ai: 'Ghi chú AI',
  khac: 'Khác',
};

export const FERT_KIND_LABEL: Record<FertKind, string> = {
  'voi-dolomite': 'Vôi / Dolomite',
  'huu-co-trichoderma': 'Hữu cơ / Trichoderma',
  'dam-ure': 'Urê / đạm amoni',
  lan: 'Lân',
  npk: 'NPK',
  khac: 'Khác',
};

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  weekly: 'Ảnh tuần',
  'prune-overview': 'Toàn tán (2 hướng)',
  'prune-under': 'Ngước vào lòng tán',
  'prune-closeup': 'Cận cảnh cụm cành',
  disease: 'Sâu bệnh',
};
