import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  Database,
  Palette,
  Scissors,
  Sprout,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import type { DatabaseInitResult } from '../../db/database';
import type { TabId } from '../../types/models';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  KpiCard,
  ListItem,
  PhotoTile,
  Skeleton,
  StatusPill,
} from '../ui';

interface PlaceholderTabProps {
  tab: TabId;
  dbState: DatabaseInitResult | null;
  onOpenSampleSheet: () => void;
  onOpenDemoDialog: () => void;
  onDemoUndoSnackbar: () => void;
  onOpenDesignShowcase: () => void;
  onNavigateTab: (tab: TabId) => void;
}

const SAMPLE_EMPTY_CODES = ['SR01', 'SR02', 'SR03'] as const;

export function PlaceholderTab({
  tab,
  dbState,
  onOpenSampleSheet,
  onOpenDemoDialog,
  onDemoUndoSnackbar,
  onOpenDesignShowcase,
  onNavigateTab,
}: PlaceholderTabProps) {
  const [checkedPhotoTask, setCheckedPhotoTask] = useState(false);

  const treeCount = dbState?.treeCount ?? 0;
  const lotACount = dbState?.lotACount ?? 0;
  const totalTrees = treeCount + lotACount;

  if (tab === 'overview') {
    return (
      <div className="space-y-5">
        <Banner
          tone="season"
          icon={<Sun className="w-6 h-6" />}
          title="Mùa khô · Lộc Tấn, Đồng Nai"
        >
          Giữ ẩm gốc bằng béc tưới, theo dõi nhện đỏ &amp; rầy xanh trên đọt non. Dữ liệu vườn khởi
          tạo trống — sẵn sàng cho T02.
        </Banner>

        {dbState ? (
          <section aria-label="Chỉ số tổng quan vườn" className="grid grid-cols-3 gap-2.5">
            <KpiCard
              value={totalTrees}
              label="cây trong vườn"
              tone="neutral"
              onClick={() => onNavigateTab('trees')}
            />
            <KpiCard
              value={treeCount}
              label="cây Lô B chưa chụp"
              tone="warn"
              onClick={() => onNavigateTab('trees')}
            />
            <KpiCard
              value={0}
              label="cần cắt tỉa"
              tone="ok"
              onClick={() => onNavigateTab('pruning')}
            />
          </section>
        ) : (
          <div className="grid grid-cols-3 gap-2.5" aria-label="Đang tải số liệu">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        )}

        {/* Section: Today's readiness */}
        <section aria-labelledby="sec-today-heading">
          <div className="flex items-baseline justify-between px-0.5 mb-2">
            <h2 id="sec-today-heading" className="text-title font-bold text-text">
              Sẵn sàng vận hành
            </h2>
            <button
              type="button"
              onClick={onOpenDesignShowcase}
              className="pressable min-h-12 px-2 inline-flex items-center gap-1.5 text-label font-semibold text-primary rounded-sm"
            >
              <Palette className="w-4 h-4" aria-hidden="true" />
              Xem #/design
            </button>
          </div>
          <Card padding="none">
            <ListItem
              leadingIcon={<Camera className="w-5.5 h-5.5" />}
              leadingTone="tc"
              title="Chụp ảnh gốc Lô B (SR01–SR15)"
              subtitle="Khởi tạo trống theo quy tắc · mở ở bước T02"
              checked={checkedPhotoTask}
              onToggleCheck={() => setCheckedPhotoTask((v) => !v)}
            />
            <ListItem
              divider
              leadingIcon={<Database className="w-5.5 h-5.5" />}
              leadingTone={dbState?.versionError ? 'danger' : 'ok'}
              title={`Cơ sở dữ liệu Dexie v1 (${dbState?.tableCount ?? 8} bảng)`}
              subtitle={
                dbState
                  ? `Lô B: ${treeCount} cây · Lô A: ${lotACount} cây · ${
                      dbState.persistentGranted ? 'Bộ nhớ bền vững: Đã cấp' : 'Bộ nhớ: Chưa cấp'
                    }`
                  : 'Đang khởi tạo cơ sở dữ liệu offline…'
              }
              trailing={
                dbState?.versionError ? (
                  <StatusPill tone="danger" icon={<AlertTriangle className="w-4 h-4" />}>
                    Cần cập nhật
                  </StatusPill>
                ) : (
                  <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                    Sẵn sàng
                  </StatusPill>
                )
              }
            />
          </Card>
        </section>

        {/* Section: Empty weekly photo tiles (honest initial state, no fake history) */}
        <section aria-labelledby="sec-photos-heading">
          <div className="flex items-baseline justify-between px-0.5 mb-2">
            <h2 id="sec-photos-heading" className="text-title font-bold text-text">
              Ảnh tuần · Lô B
            </h2>
            <span className="text-label font-semibold text-text-3 tabular-nums">
              {treeCount} cây cá thể
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_EMPTY_CODES.map((code) => (
              <PhotoTile
                key={code}
                code={code}
                emptyLabel="Chụp ảnh gốc"
                onClick={onOpenSampleSheet}
              />
            ))}
          </div>
        </section>

        {/* Quick D01 interactive controls */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-title font-bold text-text">Kiểm thử nhanh hệ thống thiết kế</h2>
          <p className="text-caption text-text-2">
            Mở các lớp nổi Material 3 mới của D01: BottomSheet (có kéo đóng &amp; cảnh báo bỏ nháp),
            Dialog và Snackbar có nút Hoàn tác.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="tonal" onClick={onDemoUndoSnackbar}>
              Thử Snackbar Hoàn tác
            </Button>
            <Button variant="outlined" onClick={onOpenDemoDialog}>
              Mở Dialog xác nhận
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (tab === 'trees') {
    return (
      <div className="space-y-4">
        <EmptyState
          illustration="durian"
          title={`Danh sách cây (${treeCount} Lô B · ${lotACount} Lô A)`}
          description="Hồ sơ từng cây SR01–SR15, tách cây khỏi Lô A, dòng thời gian ảnh tuần 1600 px WebP và ghi nhật ký hàng loạt sẽ triển khai ở T02."
          action={
            <Button variant="filled" size="lg" onClick={onOpenSampleSheet}>
              Mở biểu mẫu Ghi nhật ký mẫu
            </Button>
          }
        />
        <Card padding="none">
          <ListItem
            leadingIcon={<Sprout className="w-5.5 h-5.5" />}
            leadingTone="ok"
            title="Cây cá thể (Lô B)"
            subtitle="Khởi tạo trống SR01–SR15, không tạo lịch sử giả"
            trailing={`${treeCount} cây`}
          />
          <ListItem
            divider
            leadingIcon={<Sprout className="w-5.5 h-5.5" />}
            leadingTone="tc"
            title="Lô A (cây kiến thiết)"
            subtitle="Quản lý theo lô, hỗ trợ tách cây cá thể ở T02"
            trailing={`${lotACount} cây`}
          />
        </Card>
      </div>
    );
  }

  if (tab === 'pruning') {
    return (
      <EmptyState
        illustration="camera"
        title="Phân tích cắt tỉa & 3 góc chụp chuẩn"
        description="Checklist 6 dấu hiệu cắt tỉa, chấm mức độ (Không cần / Nhẹ / Vừa / Mạnh), cảnh báo chồi gốc ghép và 3 ô ảnh chuẩn sẽ triển khai ở T03."
        action={
          <Button
            variant="tonal"
            leadingIcon={<Scissors className="w-5 h-5" />}
            onClick={onOpenDesignShowcase}
          >
            Xem component ở #/design
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      illustration="logs"
      title="Tra cứu phác đồ & Máy tính Ri6"
      description="8 phác đồ sâu bệnh × 5 bước (FRAC/IRAC + PHI), máy tính mốc sinh lý giống Ri6 (0–105 ngày) và máy tính lưu lượng béc tưới sẽ triển khai ở T03."
      action={
        <Button
          variant="tonal"
          leadingIcon={<BookOpen className="w-5 h-5" />}
          onClick={onOpenDesignShowcase}
        >
          Xem thanh Ri6Progress ở #/design
        </Button>
      }
    />
  );
}
