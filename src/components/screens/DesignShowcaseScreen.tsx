import {
  AlertTriangle,
  Apple,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Cloud,
  Droplets,
  Ellipsis,
  Eye,
  FlaskConical,
  Info,
  Plus,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Sprout,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import sampleCanopyUrl from '../../assets/sample-canopy.svg';
import { todayVN } from '../../lib/date';
import { formatHeaderDateVN } from '../../lib/format';
import type { ISODate, TabId } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  DateField,
  Dialog,
  EmptyState,
  ExtendedFab,
  Fab,
  IconButton,
  KpiCard,
  ListItem,
  NavBar,
  NavRail,
  NumberStepper,
  PhotoTile,
  Ri6Progress,
  SegmentedButton,
  Skeleton,
  StatusPill,
  TextField,
  TopAppBar,
  TypeTile,
} from '../ui';

interface DesignShowcaseScreenProps {
  onShowUndoSnackbar: (message: string) => void;
}

const COLOR_SWATCHES: Array<{ name: string; token: string; className: string }> = [
  { name: 'Primary', token: '--color-primary', className: 'bg-primary text-on-primary' },
  {
    name: 'Primary Container',
    token: '--color-primary-container',
    className: 'bg-primary-container text-on-primary-container',
  },
  { name: 'Secondary', token: '--color-secondary', className: 'bg-secondary text-on-secondary' },
  {
    name: 'Cơm Ri6 (TC)',
    token: '--color-tertiary-container',
    className: 'bg-tertiary-container text-on-tertiary-container',
  },
  { name: 'Tốt (OK)', token: '--color-ok-container', className: 'bg-ok-container text-ok' },
  { name: 'Sắp hạn', token: '--color-warn-container', className: 'bg-warn-container text-warn' },
  {
    name: 'Quá hạn / Lỗi',
    token: '--color-danger-container',
    className: 'bg-danger-container text-danger',
  },
  {
    name: 'Phun thuốc',
    token: '--color-info-container',
    className: 'bg-info-container text-info',
  },
  { name: 'Đo pH', token: '--color-ph-container', className: 'bg-ph-container text-ph' },
  { name: 'Tưới', token: '--color-water-container', className: 'bg-water-container text-water' },
  { name: 'Ghi chú AI', token: '--color-ai-container', className: 'bg-ai-container text-ai' },
  { name: 'Bề mặt phụ', token: '--color-surface-2', className: 'bg-surface-2 text-text-2' },
];

/**
 * Full Design System Showcase screen (`#/design?design=1`, D01 AC4).
 * Displays every DESIGN §4 component across normal, selected, focusable, disabled, error, and loading states.
 */
export function DesignShowcaseScreen({ onShowUndoSnackbar }: DesignShowcaseScreenProps) {
  const today = todayVN();
  const [navPreviewTab, setNavPreviewTab] = useState<TabId>('overview');
  const [segTab, setSegTab] = useState<'overview' | 'photos' | 'logs' | 'forecast'>('logs');
  const [selectedType, setSelectedType] = useState<string>('phun-thuoc');
  const [chipLotB, setChipLotB] = useState(true);
  const [chipLotA, setChipLotA] = useState(false);
  const [checkedItem, setCheckedItem] = useState(false);
  const [ingredient, setIngredient] = useState('Emamectin benzoate');
  const [phiVal, setPhiVal] = useState(21);
  const [dateVal, setDateVal] = useState<ISODate>(today);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetNote, setSheetNote] = useState('');
  const [sheetDirty, setSheetDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Banner
        tone="info"
        icon={<Info className="w-5 h-5" />}
        title="Trang hệ thống thiết kế (#/design?design=1)"
      >
        Trưng bày toàn bộ token và component trong <strong>docs/DESIGN.md</strong> ở đầy đủ trạng
        thái (thường, chọn, tắt, lỗi, đang tải) để QA kiểm tự động và Gemini duyệt trong một màn.
      </Banner>

      {/* 1. Color tokens & Typography scale */}
      <section aria-labelledby="ds-tokens" className="space-y-3">
        <h2 id="ds-tokens" className="text-title font-bold text-text">
          1. Bảng màu vai trò &amp; thang chữ Be Vietnam Pro
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_SWATCHES.map((s) => (
            <div key={s.token} className={`rounded-md p-3 shadow-e1 ${s.className}`}>
              <div className="text-label font-bold">{s.name}</div>
              <div className="text-caption font-mono opacity-90 truncate">{s.token}</div>
            </div>
          ))}
        </div>
        <Card padding="md" className="space-y-2">
          <div className="text-display font-bold text-text">Display 28 · SR03 Góc giếng</div>
          <div className="text-headline font-bold text-text">Headline 22 · Sổ Tay Vườn Ri6</div>
          <div className="text-title font-bold text-text">Title 18 · Hôm nay cần làm</div>
          <p className="text-body text-text">
            Body 16 · Sầu riêng Ri6 xã Lộc Tấn, Đồng Nai — đất đỏ bazan, tưới béc 180 L, pH 5,6.
          </p>
          <p className="text-label font-semibold text-text-2">
            Label 14/600 · Nhãn nút, chip lọc, thanh điều hướng dưới
          </p>
          <p className="text-caption text-text-3 tabular-nums">
            Caption 14 · Mức thấp nhất cho phép (7,2:1) · 24/11/2026 · 1,5 m³
          </p>
          <div className="text-kpi font-bold text-primary tabular-nums">KPI 30 · 65 cây</div>
        </Card>
      </section>

      {/* 2. Buttons & Special buttons */}
      <section aria-labelledby="ds-buttons" className="space-y-3">
        <h2 id="ds-buttons" className="text-title font-bold text-text">
          2. Button, IconButton, FAB &amp; ExtendedFAB
        </h2>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="filled" size="lg" leadingIcon={<Check className="w-5 h-5" />}>
              Filled 56
            </Button>
            <Button variant="filled" size="md">
              Filled 48
            </Button>
            <Button variant="tonal" leadingIcon={<Sparkles className="w-5 h-5" />}>
              Tonal 48
            </Button>
            <Button variant="outlined">Outlined 48</Button>
            <Button variant="text">Text 48</Button>
            <Button variant="danger">Xóa cả đợt</Button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button variant="filled" loading>
              Đang lưu
            </Button>
            <Button variant="filled" disabled>
              Filled tắt
            </Button>
            <Button variant="tonal" disabled>
              Tonal tắt
            </Button>
            <Button variant="outlined" disabled>
              Outlined tắt
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <IconButton label="Đồng bộ tốt" statusDot="ok">
              <Cloud className="w-6 h-6" />
            </IconButton>
            <IconButton label="Đồng bộ cảnh báo" statusDot="warn">
              <Cloud className="w-6 h-6" />
            </IconButton>
            <IconButton label="Đồng bộ lỗi" statusDot="danger">
              <Cloud className="w-6 h-6" />
            </IconButton>
            <IconButton label="Cài đặt" variant="tonal">
              <Settings className="w-6 h-6" />
            </IconButton>
            <IconButton label="Nút tắt" variant="surface" disabled>
              <Settings className="w-6 h-6" />
            </IconButton>
            <Fab label="Thêm nhanh" icon={<Plus className="w-6 h-6" />} />
            <ExtendedFab icon={<Plus className="w-6 h-6" />} label="Ghi nhật ký" />
          </div>
        </Card>
      </section>

      {/* 3. Navigation frames */}
      <section aria-labelledby="ds-nav" className="space-y-3">
        <h2 id="ds-nav" className="text-title font-bold text-text">
          3. Khung màn: TopAppBar (thường &amp; trên ảnh lớn), NavBar, NavRail
        </h2>
        <Card padding="none" className="overflow-hidden">
          <TopAppBar
            preview
            title="Vườn Ri6"
            subtitle={`${formatHeaderDateVN(today)} · Lộc Tấn`}
            syncStatusDot="ok"
            onSyncClick={() => onShowUndoSnackbar('Đã bấm nút trạng thái đồng bộ mẫu')}
            onSettingsClick={() => onShowUndoSnackbar('Đã bấm nút Cài đặt mẫu')}
            className="static"
          />
        </Card>

        {/* Transparent overlay TopAppBar over hero canopy */}
        <div className="relative h-56 rounded-lg overflow-hidden shadow-e1">
          <img
            src={sampleCanopyUrl}
            alt="Ảnh minh họa tán cây SR03"
            width={480}
            height={224}
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" aria-hidden="true" />
          <TopAppBar
            variant="overlay"
            title="SR03"
            onBack={() => onShowUndoSnackbar('Quay lại từ hồ sơ cây mẫu')}
            onMoreClick={() => onShowUndoSnackbar('Mở menu hồ sơ cây mẫu')}
          />
          <div className="absolute left-4 bottom-4 z-10 text-on-primary">
            <span className="inline-block text-label font-semibold bg-hero-badge backdrop-blur-xs px-2.5 py-0.5 rounded-pill">
              Lô B · 4 năm tuổi
            </span>
            <div className="text-display font-bold mt-1.5">SR03 · Góc giếng</div>
          </div>
        </div>

        <NavBar
          preview
          activeView={navPreviewTab}
          onSelectTab={setNavPreviewTab}
          overviewBadgeCount={7}
        />

        <div className="flex items-start gap-3">
          <NavRail
            preview
            activeView={navPreviewTab}
            onSelectTab={setNavPreviewTab}
            onSelectSettings={() => onShowUndoSnackbar('Đã chọn Cài đặt trên NavRail')}
            overviewBadgeCount={7}
          />
          <Card padding="md" className="flex-1">
            <h3 className="text-body font-bold text-text">Navigation Rail (≥ 840 px)</h3>
            <p className="text-caption text-text-2 mt-1">
              Tự động thay thế thanh tab dưới trên máy tính bảng xoay ngang (Xiaomi Pad 7 Pro) và
              máy tính để bàn. Rộng cố định 80 px, giữ nguyên pill 56×32 và huy hiệu số việc.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. Banners, KPI, ListItem & StatusPill */}
      <section aria-labelledby="ds-cards" className="space-y-3">
        <h2 id="ds-cards" className="text-title font-bold text-text">
          4. Banner, KpiCard, ListItem &amp; StatusPill
        </h2>
        <Banner tone="season" icon={<Sun className="w-6 h-6" />} title="Mùa khô · tháng 11">
          Giữ ẩm gốc bằng béc, soi nhện đỏ &amp; rầy xanh. Lô B chuẩn bị xiết nước làm bông.
        </Banner>
        <div className="space-y-2">
          <Banner tone="ok" icon={<ShieldCheck className="w-5 h-5" />}>
            Hết PHI ngày 11/12 — an toàn trước mốc thu sớm nhất.
          </Banner>
          <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
            Hết PHI 15/12. Không thu hoạch trước ngày này.
          </Banner>
          <Banner tone="danger" icon={<AlertTriangle className="w-5 h-5" />}>
            Vi phạm khoảng cách 14 ngày sau bón vôi trên SR02.
          </Banner>
          <Banner tone="tc" icon={<Calendar className="w-5 h-5" />}>
            Thu hoạch dự kiến 25/12 – 09/01 (Ri6 90–105 ngày).
          </Banner>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <KpiCard value={65} label="cây trong vườn" />
          <KpiCard value={4} label="quá hạn chụp ảnh" tone="danger" />
          <KpiCard value={2} label="cần cắt tỉa" tone="warn" />
        </div>

        <Card padding="none">
          <ListItem
            leadingIcon={<FlaskConical className="w-5.5 h-5.5" />}
            leadingTone="tc"
            title="SR03 · Chuyển NPK giàu Kali"
            subtitle="Ngày 59 sau xổ nhụy · đến 30/11"
            checked={checkedItem}
            onToggleCheck={() => setCheckedItem((v) => !v)}
          />
          <ListItem
            divider
            leadingIcon={<SprayCan className="w-5.5 h-5.5" />}
            leadingTone="info"
            title="Phun thuốc · Emamectin"
            subtitle="20/11 · IRAC 6 · PHI 21 ngày · đợt 15 cây"
            showChevron
            onClick={() => onShowUndoSnackbar('Đã chọn dòng nhật ký phun thuốc mẫu')}
          />
          <ListItem
            divider
            leadingIcon={<Droplets className="w-5.5 h-5.5" />}
            leadingTone="water"
            title="Tưới béc Lô B"
            subtitle="180 L/cây · 15 cây · 2,7 m³"
            trailing="2,7 m³"
          />
          <ListItem
            divider
            leadingIcon={<Sparkles className="w-5.5 h-5.5" />}
            leadingTone="ai"
            title="Ghi chú Trợ lý AI"
            subtitle="Đề xuất tăng kiểm tra rầy xanh sau mưa"
            showChevron
            onClick={() => onShowUndoSnackbar('Mở ghi chú AI mẫu')}
          />
        </Card>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
            3 ngày
          </StatusPill>
          <StatusPill tone="warn" icon={<Eye className="w-4 h-4" />}>
            Theo dõi bệnh
          </StatusPill>
          <StatusPill tone="danger" icon={<AlertTriangle className="w-4 h-4" />}>
            Quá hạn
          </StatusPill>
          <StatusPill tone="tc" icon={<Apple className="w-4 h-4" />}>
            42 / 40 trái
          </StatusPill>
          <StatusPill tone="ph" icon={<FlaskConical className="w-4 h-4" />}>
            pH 5,6
          </StatusPill>
          <StatusPill tone="water" icon={<Droplets className="w-4 h-4" />}>
            180 L
          </StatusPill>
        </div>
      </section>

      {/* 5. Chips, SegmentedButton & TypeTile */}
      <section aria-labelledby="ds-selectors" className="space-y-3">
        <h2 id="ds-selectors" className="text-title font-bold text-text">
          5. Chip, SegmentedButton &amp; TypeTile
        </h2>
        <SegmentedButton
          ariaLabel="Chọn mục hồ sơ cây"
          value={segTab}
          onChange={setSegTab}
          options={[
            { value: 'overview', label: 'Tổng quan' },
            { value: 'photos', label: 'Ảnh' },
            { value: 'logs', label: 'Nhật ký' },
            { value: 'forecast', label: 'Dự báo' },
          ]}
        />
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Chip variant="filter" selected={chipLotB} onClick={() => setChipLotB((v) => !v)}>
              Tất cả Lô B · 15 cây
            </Chip>
            <Chip
              variant="filter"
              selected={chipLotA}
              leadingIcon={chipLotA ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              onClick={() => setChipLotA((v) => !v)}
            >
              Kèm Lô A
            </Chip>
            <Chip variant="suggestion" onClick={() => onShowUndoSnackbar('Đã chọn chip gợi ý')}>
              Gợi ý: Hôm nay
            </Chip>
            <Chip variant="choice" disabled>
              Chip tắt
            </Chip>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <TypeTile
              icon={<Sprout className="w-5.5 h-5.5" />}
              label="Bón phân"
              selected={selectedType === 'bon-phan'}
              onClick={() => setSelectedType('bon-phan')}
            />
            <TypeTile
              icon={<SprayCan className="w-5.5 h-5.5" />}
              label="Phun thuốc"
              selected={selectedType === 'phun-thuoc'}
              onClick={() => setSelectedType('phun-thuoc')}
            />
            <TypeTile
              icon={<Droplets className="w-5.5 h-5.5" />}
              label="Tưới"
              selected={selectedType === 'tuoi'}
              onClick={() => setSelectedType('tuoi')}
            />
            <TypeTile
              icon={<FlaskConical className="w-5.5 h-5.5" />}
              label="Đo pH"
              selected={selectedType === 'do-ph'}
              onClick={() => setSelectedType('do-ph')}
            />
            <TypeTile
              icon={<Scissors className="w-5.5 h-5.5" />}
              label="Cắt tỉa"
              selected={selectedType === 'cat-tia'}
              onClick={() => setSelectedType('cat-tia')}
            />
            <TypeTile icon={<Ellipsis className="w-5.5 h-5.5" />} label="Khác (tắt)" disabled />
          </div>
        </Card>
      </section>

      {/* 6. Inputs: TextField, NumberStepper, DateField */}
      <section aria-labelledby="ds-inputs" className="space-y-3">
        <h2 id="ds-inputs" className="text-title font-bold text-text">
          6. Ô nhập liệu: TextField, NumberStepper &amp; DateField
        </h2>
        <Card padding="md" className="space-y-4">
          <TextField
            label="Hoạt chất (thường)"
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            helperText="Nhóm IRAC 6 · liều lượng theo nhãn"
          />
          <TextField
            label="Đo pH đất (trạng thái lỗi)"
            defaultValue="2,5"
            error="Giá trị pH phải nằm từ 3,0 đến 9,0."
          />
          <TextField
            label="Mã cây tự sinh (đã tắt)"
            defaultValue="SR03"
            disabled
            helperText="Trạng thái khóa chỉnh sửa"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberStepper
              label="Thời gian cách ly (thường)"
              value={phiVal}
              min={0}
              max={60}
              unit="ngày PHI"
              onChange={setPhiVal}
            />
            <NumberStepper
              label="Số trái (lỗi)"
              value={52}
              min={0}
              max={100}
              unit="trái / cây"
              error="Vượt giới hạn 40 trái khuyến nghị"
              onChange={() => undefined}
            />
          </div>
          <NumberStepper
            label="Lượng nước béc (đã tắt)"
            value={180}
            unit="L / cây"
            disabled
            onChange={() => undefined}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField
              label="Ngày phun (thường)"
              value={dateVal}
              showTodayAction
              onChange={setDateVal}
            />
            <DateField
              label="Ngày xổ nhụy (lỗi)"
              value={dateVal}
              error="Ngày không được ở tương lai"
              onChange={() => undefined}
            />
          </div>
          <DateField label="Ngày tạo (đã tắt)" value={today} disabled onChange={() => undefined} />
        </Card>
      </section>

      {/* 7. PhotoTile, Ri6Progress, EmptyState & Skeleton */}
      <section aria-labelledby="ds-specialized" className="space-y-3">
        <h2 id="ds-specialized" className="text-title font-bold text-text">
          7. PhotoTile, Ri6Progress, EmptyState &amp; Skeleton
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <PhotoTile
            code="SR01"
            src={sampleCanopyUrl}
            statusTone="ok"
            statusIcon={<CheckCircle2 className="w-4 h-4" />}
            statusLabel="3 ngày"
            onClick={() => onShowUndoSnackbar('Mở ảnh SR01 mẫu')}
          />
          <PhotoTile
            code="SR02"
            src={sampleCanopyUrl}
            statusTone="danger"
            statusIcon={<AlertTriangle className="w-4 h-4" />}
            statusLabel="Quá hạn"
            onClick={() => onShowUndoSnackbar('Mở ảnh SR02 mẫu')}
          />
          <PhotoTile
            code="SR03"
            emptyLabel="Chụp ảnh gốc"
            onClick={() => onShowUndoSnackbar('Mở máy ảnh chụp gốc SR03')}
          />
        </div>

        <Ri6Progress day={59} subtitle="sau xổ nhụy 26/09">
          <Banner tone="tc" icon={<Calendar className="w-5 h-5" />}>
            <strong className="tabular-nums">Thu hoạch dự kiến 25/12 – 09/01</strong>
          </Banner>
          <Banner tone="ok" icon={<ShieldCheck className="w-5 h-5" />}>
            <span className="tabular-nums">Hết PHI ngày 11/12 — trước mốc thu sớm nhất</span>
          </Banner>
        </Ri6Progress>

        <EmptyState
          illustration="camera"
          title="Chưa có ảnh tuần nào"
          description="Chụp ảnh tán cây mỗi tuần để theo dõi ra đọt, rầy xanh và so sánh sự phát triển."
          action={
            <Button
              variant="filled"
              size="lg"
              leadingIcon={<Camera className="w-5 h-5" />}
              onClick={() => onShowUndoSnackbar('Đã kích hoạt nút chụp ảnh mẫu')}
            >
              Chụp ảnh tuần
            </Button>
          }
        />

        <Card
          padding="md"
          role="region"
          className="space-y-3"
          aria-label="Mẫu trạng thái đang tải Skeleton"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="heading" />
              <Skeleton variant="text" className="w-5/6" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton variant="tile" />
            <Skeleton variant="tile" />
            <Skeleton variant="tile" />
          </div>
        </Card>
      </section>

      {/* 8. Interactive overlays */}
      <section aria-labelledby="ds-overlays" className="space-y-3">
        <h2 id="ds-overlays" className="text-title font-bold text-text">
          8. Lớp nổi tương tác: BottomSheet, Dialog &amp; Snackbar
        </h2>
        <Card padding="md" className="flex flex-wrap gap-2.5">
          <Button
            variant="filled"
            size="lg"
            onClick={() => {
              setSheetNote('');
              setSheetDirty(false);
              setSheetOpen(true);
            }}
          >
            Mở BottomSheet mẫu
          </Button>
          <Button variant="outlined" onClick={() => setDialogOpen(true)}>
            Mở Dialog xác nhận
          </Button>
          <Button
            variant="tonal"
            onClick={() => onShowUndoSnackbar('Đã xóa 1 mục nhật ký mẫu')}
          >
            Hiện Snackbar có Hoàn tác
          </Button>
        </Card>
      </section>

      <BottomSheet
        open={sheetOpen}
        title="Biểu mẫu BottomSheet mẫu"
        subtitle="Gõ vào ô dưới rồi kéo xuống hoặc bấm X để kiểm tra hỏi xác nhận bỏ nháp"
        dirty={sheetDirty}
        onClose={() => setSheetOpen(false)}
        footer={({ requestClose }) => (
          <>
            <Button variant="text" onClick={requestClose}>
              Hủy
            </Button>
            <Button
              variant="filled"
              size="lg"
              fullWidth
              onClick={() => {
                setSheetOpen(false);
                onShowUndoSnackbar('Đã lưu biểu mẫu thử nghiệm');
              }}
            >
              Lưu thay đổi
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <TextField
            label="Ghi chú thử nghiệm"
            placeholder="Nhập vài ký tự để đánh dấu form đã sửa…"
            value={sheetNote}
            onChange={(e) => {
              setSheetNote(e.target.value);
              setSheetDirty(e.target.value.length > 0);
            }}
            helperText={
              sheetDirty
                ? 'Trạng thái: Đã sửa — đóng biểu mẫu sẽ hiện hộp thoại xác nhận.'
                : 'Chưa sửa — có thể kéo xuống đóng ngay.'
            }
          />
          <Banner tone="ok" icon={<CheckCircle2 className="w-5 h-5" />}>
            Thanh nút bên dưới dính đáy và tự nâng theo <code>visualViewport</code> khi mở bàn phím
            ảo Android.
          </Banner>
        </div>
      </BottomSheet>

      <Dialog
        open={dialogOpen}
        title="Xác nhận xóa cả đợt?"
        subtitle="Thao tác phá hủy cần xác nhận rõ ràng (DESIGN §3 & §6)"
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialogOpen(false);
                onShowUndoSnackbar('Đã xác nhận thao tác từ Dialog');
              }}
            >
              Xóa cả đợt
            </Button>
          </>
        }
      >
        <p>
          Hộp thoại giữ vòng focus bằng phím <strong>Tab</strong>, đóng bằng phím{' '}
          <strong>Esc</strong> hoặc nút <strong>Back</strong> trên Android.
        </p>
      </Dialog>
    </div>
  );
}
