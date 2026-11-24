import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  LayoutDashboard,
  Scissors,
  Sprout,
} from 'lucide-react';
import type { DatabaseInitResult } from '../../db/database';
import type { TabId } from '../../types/models';

interface PlaceholderTabProps {
  tab: TabId;
  dbState: DatabaseInitResult | null;
  onDemoToast: () => void;
  onDemoModal: () => void;
}

const TAB_META: Record<
  TabId,
  {
    title: string;
    taskTag: string;
    description: string;
    icon: typeof LayoutDashboard;
    plannedItems: string[];
  }
> = {
  overview: {
    title: 'Tổng quan vườn Ri6',
    taskTag: 'Sẽ triển khai ở T02',
    description:
      'Màn hình tổng quan KPI tổng số cây tính động, nhắc chụp ảnh tuần cho cây cá thể, chuyển mùa khô/mưa Đông Nam Bộ và cảnh báo PHI.',
    icon: LayoutDashboard,
    plannedItems: [
      'KPI quy mô vườn tính động từ dữ liệu Lô A và danh sách cây cá thể',
      'Lưới ô cây cá thể hiển thị màu + chữ trạng thái chụp ảnh tuần',
      'Khuyến cáo canh tác theo mùa khô (T11–T4) / mùa mưa (T5–T10)',
    ],
  },
  trees: {
    title: 'Hồ sơ cây cá thể & Lô A',
    taskTag: 'Sẽ triển khai ở T02',
    description:
      'Quản lý từng cây cá thể (có thể thêm/xóa mềm và tách cây từ Lô A), chụp/nén ảnh tuần lưu IndexedDB và ghi nhật ký đơn lẻ hoặc hàng loạt.',
    icon: Sprout,
    plannedItems: [
      'Tìm kiếm và lọc 4 trạng thái (Tất cả, Cần chụp, Cần cắt tỉa, Sâu bệnh)',
      'Hồ sơ cây khởi tạo trống, tải trái (fruitCount/fruitLimit), dòng thời gian ảnh ≤ 1280 px',
      'Nhật ký Phun thuốc (PHI), Bón phân (loại phân), Đo pH đất, ghi hàng loạt & sao lưu JSON',
    ],
  },
  pruning: {
    title: 'Phân tích cắt tỉa & 3 góc chụp',
    taskTag: 'Sẽ triển khai ở T03',
    description:
      'Checklist 6 dấu hiệu cắt tỉa, tự chấm mức độ (Không cần / Nhẹ / Vừa / Mạnh) và hướng dẫn chụp đủ 3 góc chuẩn.',
    icon: Scissors,
    plannedItems: [
      'Checklist 6 dấu hiệu, tự cảnh báo cắt bỏ chồi gốc ghép ngay',
      '3 ô ảnh chuẩn: toàn tán 3–5 m, ngước lòng tán, cận cảnh cụm cành',
      'Lưu trạng thái Cần cắt tỉa, tạo nhật ký và nhắc khử trùng dụng cụ',
    ],
  },
  reference: {
    title: 'Tra cứu phác đồ & Máy tính Ri6',
    taskTag: 'Sẽ triển khai ở T03',
    description:
      '8 thẻ phác đồ sâu bệnh × 5 bước (FRAC/IRAC + PHI), máy tính mốc sinh lý giống Ri6 và máy tính béc tưới theo dữ liệu vườn.',
    icon: BookOpen,
    plannedItems: [
      '8 phác đồ sâu bệnh chuẩn 5 bước kèm khuyến cáo nhóm cơ chế FRAC/IRAC',
      'Máy tính mốc Ri6 từ ngày mắt cua hoặc xổ nhụy tới ngày thu hoạch',
      'Máy tính lưu lượng m³/lần và m³/tuần kèm quy tắc đặt béc gốc',
    ],
  },
};

export function PlaceholderTab({
  tab,
  dbState,
  onDemoToast,
  onDemoModal,
}: PlaceholderTabProps) {
  const meta = TAB_META[tab];
  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      {/* Main Placeholder Card */}
      <section className="bg-white rounded-2xl border border-sand-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-durian-100 text-durian-900 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-basalt-100 text-basalt-800 text-xs font-bold mb-1">
                {meta.taskTag}
              </span>
              <h2 className="text-xl font-extrabold text-ink leading-snug">{meta.title}</h2>
            </div>
          </div>
        </div>

        <p className="text-base text-ink leading-relaxed">{meta.description}</p>

        <ul className="space-y-2 text-base text-ink bg-sand rounded-xl border border-sand-200 p-4">
          {meta.plannedItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-durian-800 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* T01 Interactive Verification Controls for Toast & Modal */}
        {tab === 'overview' && (
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDemoToast}
              className="min-h-[48px] px-4 rounded-xl bg-durian-900 hover:bg-durian-950 text-white text-base font-bold transition"
            >
              Thử thông báo Toast
            </button>
            <button
              type="button"
              onClick={onDemoModal}
              className="min-h-[48px] px-4 rounded-xl bg-basalt-700 hover:bg-basalt-800 text-white text-base font-bold transition"
            >
              Mở hộp thoại Modal
            </button>
          </div>
        )}
      </section>

      {/* Dexie Database Initialization Status Card */}
      <section className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-durian-900 shrink-0" aria-hidden="true" />
            Cơ sở dữ liệu offline (Dexie v1 · {dbState?.tableCount ?? 8} bảng)
          </h3>
          {dbState?.versionError ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-danger-bg text-status-danger text-sm font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Cần cập nhật ứng dụng
            </span>
          ) : dbState ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-ok-bg text-status-ok text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              Sẵn sàng
            </span>
          ) : (
            <span className="text-sm font-medium text-ink-muted">Đang khởi tạo…</span>
          )}
        </div>

        {dbState && !dbState.versionError && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-base">
            <div className="rounded-xl bg-sand border border-sand-200 p-3.5">
              <p className="text-sm font-semibold text-ink-muted">Cây cá thể (Lô B)</p>
              <p className="text-lg font-extrabold text-durian-900 mt-0.5 tabular-nums">
                {dbState.treeCount} cây
              </p>
            </div>
            <div className="rounded-xl bg-sand border border-sand-200 p-3.5">
              <p className="text-sm font-semibold text-ink-muted">Lô A (LOT_A)</p>
              <p className="text-lg font-extrabold text-basalt-700 mt-0.5 tabular-nums">
                {dbState.lotACount} cây
              </p>
            </div>
            <div className="rounded-xl bg-sand border border-sand-200 p-3.5">
              <p className="text-sm font-semibold text-ink-muted">Bộ nhớ bền vững</p>
              <p className="text-lg font-extrabold text-ink mt-0.5">
                {dbState.persistentGranted ? 'Đã cấp' : 'Chưa cấp'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
