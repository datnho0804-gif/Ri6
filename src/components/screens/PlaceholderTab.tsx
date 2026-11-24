import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  HardDrive,
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
  onNavigateTab: (tab: TabId) => void;
}

const SAMPLE_EMPTY_CODES = ['SR01', 'SR02', 'SR03'] as const;

export function PlaceholderTab({
  tab,
  dbState,
  onOpenSampleSheet,
  onOpenDemoDialog,
  onDemoUndoSnackbar,
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
          Giữ ẩm gốc bằng béc tưới, soi nhện đỏ &amp; rầy xanh trên đọt non. Sổ tay đã sẵn sàng để
          bắt đầu ghi chép cho vườn.
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
              Cần chuẩn bị
            </h2>
          </div>
          <Card padding="none">
            <ListItem
              leadingIcon={<Camera className="w-5.5 h-5.5" />}
              leadingTone="tc"
              title={`Sắp có: chụp ảnh gốc cho ${treeCount || 15} cây Lô B`}
              subtitle="Theo dõi tán cây hằng tuần ngay trên máy"
              checked={checkedPhotoTask}
              onToggleCheck={() => setCheckedPhotoTask((v) => !v)}
            />
            <ListItem
              divider
              leadingIcon={<HardDrive className="w-5.5 h-5.5" />}
              leadingTone={dbState?.versionError ? 'danger' : 'ok'}
              title="Dữ liệu vườn trên máy"
              subtitle={
                dbState
                  ? `Lô B: ${treeCount} cây · Lô A: ${lotACount} cây · lưu ngoại tuyến`
                  : 'Đang mở dữ liệu vườn…'
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

        {/* Preview interactive actions without developer jargon */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-title font-bold text-text">Bản xem trước thao tác</h2>
          <p className="text-caption text-text-2">
            Thử nhanh thông báo hoàn tác trong 5 giây hoặc hộp xác nhận trước khi tính năng lưu dữ
            liệu hoàn thiện.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="tonal" onClick={onDemoUndoSnackbar}>
              Thử hoàn tác
            </Button>
            <Button variant="outlined" onClick={onOpenDemoDialog}>
              Xem hộp xác nhận
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
          description="Sắp có: quản lý hồ sơ từng cây SR01–SR15, tách cây khỏi Lô A, lưu ảnh chụp hằng tuần và ghi nhật ký chăm sóc hàng loạt."
          action={
            <Button variant="filled" size="lg" onClick={onOpenSampleSheet}>
              Xem trước biểu mẫu Ghi nhật ký
            </Button>
          }
        />
        <Card padding="none">
          <ListItem
            leadingIcon={<Sprout className="w-5.5 h-5.5" />}
            leadingTone="ok"
            title="Cây cá thể (Lô B)"
            subtitle="Khởi tạo trống SR01–SR15, chưa có lịch sử chăm sóc"
            trailing={`${treeCount} cây`}
          />
          <ListItem
            divider
            leadingIcon={<Sprout className="w-5.5 h-5.5" />}
            leadingTone="tc"
            title="Lô A (cây kiến thiết)"
            subtitle="Theo dõi theo lô và tách cây riêng khi cần"
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
        description="Sắp có: kiểm tra 6 dấu hiệu cắt tỉa, tự gợi ý mức độ (Không cần / Nhẹ / Vừa / Mạnh), nhắc bỏ chồi gốc ghép và lưu 3 góc chụp tán cây."
        action={
          <Button variant="tonal" onClick={() => onNavigateTab('overview')}>
            Quay lại Tổng quan
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      illustration="logs"
      title="Tra cứu phác đồ & Máy tính Ri6"
      description="Sắp có: tra cứu 8 phác đồ sâu bệnh theo hoạt chất & thời gian cách ly, tính mốc nuôi trái Ri6 (0–105 ngày) và tính lượng nước béc tưới."
      action={
        <Button variant="tonal" onClick={() => onNavigateTab('overview')}>
          Quay lại Tổng quan
        </Button>
      }
    />
  );
}
