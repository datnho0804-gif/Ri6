import {
  AlertTriangle,
  Apple,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Plus,
  Scissors,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import sampleCanopyUrl from '../../assets/sample-canopy.svg';
import { copyTextToClipboard } from '../../hooks/clipboard';
import { formatMilestoneDates, latestPhiSprayEnd } from '../../hooks/treePresentation';
import { useThemeColor } from '../../hooks/useThemeColor';
import { buildTreeCopyPrompt } from '../../lib/copyPrompt';
import { formatDateVN, todayVN } from '../../lib/date';
import { formatBytesVN, formatRelativeDateVN, formatShortDateVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import { HEALTH_LABEL, PHOTO_KIND_LABEL, STAGE_LABEL } from '../../lib/labels';
import { phiMessage, phiWarning, sprayLogsWithoutPhi } from '../../lib/phi';
import { harvestWindow, ri6Day, ri6Milestones } from '../../lib/ri6';
import type {
  ISODate,
  Log,
  Photo,
  Season,
  Stage,
  Tree,
  TreeHealth,
} from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  DateField,
  Dialog,
  EmptyState,
  ListItem,
  NumberStepper,
  PhotoLightbox,
  Ri6Progress,
  SegmentedButton,
  SelectField,
  StatusPill,
  TextField,
  TopAppBar,
} from '../ui';
import { LogTimeline } from './LogTimeline';

interface TreeProfileScreenProps {
  tree: Tree;
  duplicateCodeSet: ReadonlyMap<string, string[]>;
  logs: Log[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  season: Season;
  hapticsEnabled: boolean;
  /** True when embedded in right-hand master-detail column on >=840px screens. */
  embedded?: boolean;
  onBack?: () => void;
  onUpdateTree: (tree: Tree, patch: Partial<Tree>) => Promise<Tree>;
  onDeleteTree: (tree: Tree) => Promise<void>;
  onOpenAddLog: () => void;
  onDeleteLog: (log: Log) => void;
  onDeleteBatch: (batchId: string) => void;
  onCaptureWeeklyPhoto: (tree: Tree, file: File) => Promise<void>;
  getPhotoFullUrl: (photoId: string) => Promise<string | null>;
  onEnsureRemotePhoto?: (photoId: string) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

const STAGE_OPTIONS = [
  { value: '', label: '— Chưa chọn giai đoạn —' },
  ...(Object.entries(STAGE_LABEL) as Array<[Stage, string]>).map(([value, label]) => ({
    value,
    label,
  })),
];

const HEALTH_OPTIONS = (Object.entries(HEALTH_LABEL) as Array<[TreeHealth, string]>).map(
  ([value, label]) => ({ value, label }),
);

/**
 * Full-bleed M2 Tree Profile screen matching docs/design/mockup.jpg panel #2 (T02 AC4–AC6, T03 AC6).
 */
export function TreeProfileScreen({
  tree,
  duplicateCodeSet,
  logs,
  photos,
  thumbUrls,
  season,
  hapticsEnabled,
  embedded = false,
  onBack,
  onUpdateTree,
  onDeleteTree,
  onOpenAddLog,
  onDeleteLog,
  onDeleteBatch,
  onCaptureWeeklyPhoto,
  getPhotoFullUrl,
  onEnsureRemotePhoto,
  onNotify,
}: TreeProfileScreenProps) {
  const today = todayVN();
  const [subTab, setSubTab] = useState<'overview' | 'photos' | 'logs' | 'forecast'>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string; subcaption: string } | null>(
    null,
  );
  const [fallbackPromptText, setFallbackPromptText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dark browser status bar when hero photo occupies full mobile viewport top (DESIGN §6)
  useThemeColor(embedded ? 'bg' : 'dark');

  const treePhotos = useMemo(
    () =>
      photos
        .filter((p) => !p.deletedAt && p.targetId === tree.id)
        .sort((a, b) =>
          a.takenAt === b.takenAt
            ? b.updatedAt.localeCompare(a.updatedAt)
            : b.takenAt.localeCompare(a.takenAt),
        ),
    [photos, tree.id],
  );

  const latestWeeklyPhoto = useMemo(
    () => treePhotos.find((p) => p.kind === 'weekly') ?? null,
    [treePhotos],
  );

  // SPEC §6 step 7: only download remote photos from GitHub when opening to view
  useEffect(() => {
    if (!onEnsureRemotePhoto) return;
    if (latestWeeklyPhoto?.remotePath && !thumbUrls.has(latestWeeklyPhoto.id)) {
      void onEnsureRemotePhoto(latestWeeklyPhoto.id);
    }
    if (subTab === 'photos') {
      for (const p of treePhotos) {
        if (p.remotePath && !thumbUrls.has(p.id)) {
          void onEnsureRemotePhoto(p.id);
        }
      }
    }
  }, [latestWeeklyPhoto, onEnsureRemotePhoto, subTab, thumbUrls, treePhotos]);

  const heroSrc = latestWeeklyPhoto ? thumbUrls.get(latestWeeklyPhoto.id) : undefined;
  const isDuplicate = duplicateCodeSet.has(tree.code.trim().toUpperCase());

  const harvestPhiWarning = useMemo(
    () => (tree.flowerDate ? phiWarning(tree.flowerDate, logs, tree.id) : null),
    [logs, tree.flowerDate, tree.id],
  );
  const latestSprayPhi = useMemo(() => latestPhiSprayEnd(logs, tree.id), [logs, tree.id]);
  const missingPhiCount = useMemo(() => sprayLogsWithoutPhi(logs, tree.id).length, [logs, tree.id]);

  const forecastRows = useMemo(() => {
    if (tree.flowerDate) return ri6Milestones({ kind: 'xo-nhuy', date: tree.flowerDate });
    if (tree.budDate) return ri6Milestones({ kind: 'mat-cua', date: tree.budDate });
    return [];
  }, [tree.budDate, tree.flowerDate]);

  const daysSinceFlower = tree.flowerDate ? Math.max(0, ri6Day(tree.flowerDate, today)) : null;
  const expectedHarvest = tree.flowerDate ? harvestWindow(tree.flowerDate) : null;
  const fruitOverLimit =
    tree.fruitCount !== undefined &&
    tree.fruitLimit !== undefined &&
    tree.fruitCount > tree.fruitLimit;

  const handleCopyPrompt = async () => {
    const text = buildTreeCopyPrompt({
      tree,
      logs,
      lastWeekly: latestWeeklyPhoto?.takenAt,
      season,
      today,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      triggerHaptic(hapticsEnabled);
      onNotify(`Đã copy Prompt cho ${tree.code}`, 'ok');
    } else {
      setFallbackPromptText(text);
    }
  };

  const handlePhotoFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setCapturing(true);
    try {
      await onCaptureWeeklyPhoto(tree, file);
    } catch {
      onNotify('Không xử lý được ảnh vừa chọn. Hãy thử ảnh khác.', 'danger');
    } finally {
      setCapturing(false);
    }
  };

  const handleOpenLightbox = async (photo: Photo) => {
    const url = await getPhotoFullUrl(photo.id);
    if (!url) {
      onNotify('Ảnh chưa có trên máy này.', 'warn');
      return;
    }
    setLightbox({
      src: url,
      caption: `${tree.code} · ${PHOTO_KIND_LABEL[photo.kind]}`,
      subcaption: `${formatDateVN(photo.takenAt)} · ${photo.width}×${photo.height} · ${formatBytesVN(photo.bytes)}`,
    });
  };

  return (
    <div className={embedded ? 'bg-bg rounded-xl overflow-hidden shadow-e1 border border-outline' : 'min-h-dvh bg-bg pb-28'}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={`Chụp ảnh tuần cho ${tree.code}`}
        onChange={(e) => {
          void handlePhotoFileSelected(e.target.files?.[0]);
        }}
      />

      {/* Full-bleed Hero photo matching mockup #2 */}
      <div className="relative h-72 w-full overflow-hidden bg-text">
        <img
          src={heroSrc ?? sampleCanopyUrl}
          alt={heroSrc ? `Ảnh gần nhất của cây ${tree.code}` : `Ảnh minh họa tán cây ${tree.code}`}
          width={800}
          height={300}
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />

        <TopAppBar
          variant="overlay"
          title={tree.code}
          onBack={onBack}
          backLabel="Quay lại danh sách"
          onMoreClick={() => setEditOpen(true)}
          moreLabel={`Sửa thông tin cây ${tree.code}`}
        />

        <div className="absolute left-5 right-5 bottom-9 z-10 text-on-primary">
          <span className="inline-block text-label font-semibold bg-hero-badge backdrop-blur-xs px-3 py-0.5 rounded-pill">
            Lô {tree.lot}
            {tree.ageYears !== null ? ` · ${tree.ageYears} năm tuổi` : ''}
          </span>
          <h2 className="text-display font-bold mt-2 leading-tight truncate">
            {tree.label || tree.code}
          </h2>
          <p className="text-caption opacity-95 mt-0.5 tabular-nums">
            {latestWeeklyPhoto
              ? `Ảnh tuần chụp ${formatRelativeDateVN(latestWeeklyPhoto.takenAt, today)} · ${formatShortDateVN(latestWeeklyPhoto.takenAt)}`
              : 'Chưa có ảnh gốc — bấm "Chụp ảnh tuần" bên dưới'}
          </p>
        </div>
      </div>

      {/* Rounded overlapping sheet body (DESIGN §3) */}
      <div className="relative -mt-6 rounded-t-xl bg-bg px-4 pt-5 pb-6 space-y-4">
        {/* Status pills row */}
        <div className="flex flex-wrap gap-2">
          {isDuplicate && (
            <StatusPill tone="danger" icon={<AlertTriangle className="w-4 h-4" />}>
              Trùng mã — đổi mã
            </StatusPill>
          )}
          {tree.stage && (
            <StatusPill tone="ok" icon={<Apple className="w-4 h-4" />}>
              {STAGE_LABEL[tree.stage]}
            </StatusPill>
          )}
          <StatusPill
            tone={tree.health === 'tot' ? 'ok' : tree.health === 'theo-doi' ? 'warn' : 'danger'}
            icon={
              tree.health === 'tot' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )
            }
          >
            {HEALTH_LABEL[tree.health]}
          </StatusPill>
          {tree.needsPruning && (
            <StatusPill tone="sec" icon={<Scissors className="w-4 h-4" />}>
              Cần cắt tỉa
            </StatusPill>
          )}
          {tree.diseaseWatch && (
            <StatusPill tone="warn" icon={<Eye className="w-4 h-4" />}>
              Theo dõi bệnh
            </StatusPill>
          )}
          {tree.fruitCount !== undefined && (
            <StatusPill tone={fruitOverLimit ? 'danger' : 'tc'} icon={<Apple className="w-4 h-4" />}>
              {tree.fruitCount}
              {tree.fruitLimit !== undefined ? ` / ${tree.fruitLimit}` : ''} trái
            </StatusPill>
          )}
        </div>

        {/* Fruit overload warning (SPEC M2 & M6) */}
        {fruitOverLimit && (
          <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
            Số trái đang mang ({tree.fruitCount}) vượt mức tối đa bạn đặt ({tree.fruitLimit} trái).
            Cân nhắc tỉa bớt trái để giữ sức cây và chất lượng cơm Ri6.
          </Banner>
        )}

        {/* Active PHI conflict warning (SPEC M2 & T03 AC6) */}
        {harvestPhiWarning ? (
          <Banner tone="danger" icon={<AlertTriangle className="w-5 h-5" />}>
            <span className="tabular-nums font-semibold">{phiMessage(harvestPhiWarning)}</span>
          </Banner>
        ) : latestSprayPhi && latestSprayPhi.endDate > today ? (
          <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
            <span className="tabular-nums">
              Không thu hoạch trước <strong>{formatDateVN(latestSprayPhi.endDate)}</strong> (phun{' '}
              {latestSprayPhi.log.activeIngredient?.trim() || 'chưa rõ'} ngày{' '}
              {formatShortDateVN(latestSprayPhi.log.date)}, PHI {latestSprayPhi.log.phiDays} ngày).
            </span>
          </Banner>
        ) : null}

        {missingPhiCount > 0 && (
          <Banner tone="info" icon={<AlertTriangle className="w-5 h-5" />}>
            Có {missingPhiCount} lần phun thuốc chưa ghi số ngày cách ly (PHI). Hãy kiểm tra lại
            trong tab Nhật ký để cảnh báo thu hoạch luôn chính xác.
          </Banner>
        )}

        {/* Ri6 Progress card when flowerDate is recorded (mockup #2 & T03 AC6) */}
        {daysSinceFlower !== null && tree.flowerDate && (
          <Ri6Progress day={daysSinceFlower} subtitle={`sau xổ nhụy ${formatShortDateVN(tree.flowerDate)}`}>
            {expectedHarvest && (
              <Banner tone="tc" icon={<Calendar className="w-5 h-5" />}>
                <strong className="tabular-nums">
                  Thu hoạch dự kiến {formatShortDateVN(expectedHarvest.from)} –{' '}
                  {formatShortDateVN(expectedHarvest.to)}
                </strong>
              </Banner>
            )}
            {latestSprayPhi && !harvestPhiWarning && (
              <Banner tone="ok" icon={<ShieldCheck className="w-5 h-5" />}>
                <span className="tabular-nums">
                  Hết PHI ngày {formatShortDateVN(latestSprayPhi.endDate)} — an toàn trước mốc thu sớm nhất
                </span>
              </Banner>
            )}
          </Ri6Progress>
        )}

        {/* 4-tab SegmentedButton (mockup #2) */}
        <SegmentedButton
          ariaLabel="Mục chi tiết hồ sơ cây"
          value={subTab}
          onChange={setSubTab}
          options={[
            { value: 'overview', label: 'Tổng quan' },
            { value: 'photos', label: 'Ảnh' },
            { value: 'logs', label: 'Nhật ký' },
            { value: 'forecast', label: 'Dự báo' },
          ]}
        />

        {/* Sub-tab 1: Overview & Editable Metadata */}
        {subTab === 'overview' && (
          <div className="space-y-4">
            <Card padding="none">
              <ListItem title="Mã hiển thị" subtitle={`Lô ${tree.lot}`} trailing={tree.code} />
              <ListItem
                divider
                title="Vị trí trong vườn"
                subtitle={tree.location || 'Chưa ghi vị trí'}
              />
              <ListItem
                divider
                title="Tuổi cây"
                trailing={tree.ageYears !== null ? `${tree.ageYears} năm` : 'Chưa ghi'}
              />
              <ListItem
                divider
                title="Mốc làm bông"
                subtitle={`Mắt cua: ${tree.budDate ? formatDateVN(tree.budDate) : '—'} · Xổ nhụy: ${tree.flowerDate ? formatDateVN(tree.flowerDate) : '—'}`}
              />
              <ListItem
                divider
                title="Tải trái"
                subtitle={
                  tree.fruitCountDate
                    ? `Cập nhật ngày ${formatDateVN(tree.fruitCountDate)}`
                    : 'Chưa đếm số trái'
                }
                trailing={
                  tree.fruitCount !== undefined
                    ? `${tree.fruitCount}${tree.fruitLimit !== undefined ? ` / ${tree.fruitLimit}` : ''} trái`
                    : '—'
                }
              />
              {tree.note?.trim() && (
                <ListItem divider title="Ghi chú" subtitle={tree.note.trim()} />
              )}
            </Card>

            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="tonal"
                leadingIcon={<Edit3 className="w-5 h-5" />}
                onClick={() => setEditOpen(true)}
              >
                Sửa thông tin cây
              </Button>
              <Button
                variant="outlined"
                leadingIcon={<Plus className="w-5 h-5" />}
                onClick={onOpenAddLog}
              >
                Ghi nhật ký cây này
              </Button>
              <Button
                variant="text"
                leadingIcon={<Trash2 className="w-5 h-5" />}
                className="text-danger"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Xóa cây
              </Button>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Photo timeline */}
        {subTab === 'photos' && (
          <div className="space-y-3">
            {treePhotos.length === 0 ? (
              <EmptyState
                illustration="camera"
                title="Chưa có ảnh nào cho cây này"
                description="Chụp ảnh tán cây hằng tuần để theo dõi ra đọt, sâu bệnh và tự động đặt lại chu kỳ nhắc 7 ngày."
                action={
                  <Button
                    variant="filled"
                    size="lg"
                    loading={capturing}
                    leadingIcon={<Camera className="w-5 h-5" />}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    Chụp ảnh tuần đầu tiên
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {treePhotos.map((photo) => {
                  const thumb = thumbUrls.get(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        void handleOpenLightbox(photo);
                      }}
                      className="pressable bg-surface rounded-md shadow-e1 overflow-hidden text-left flex flex-col"
                    >
                      <div className="aspect-square w-full bg-surface-2 overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={`${PHOTO_KIND_LABEL[photo.kind]} ngày ${formatDateVN(photo.takenAt)}`}
                            width={480}
                            height={480}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-3 text-caption p-3 text-center">
                            Ảnh chưa tải về máy
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-label font-bold text-text tabular-nums">
                          {formatDateVN(photo.takenAt)}
                        </div>
                        <div className="text-caption text-text-3 truncate">
                          {PHOTO_KIND_LABEL[photo.kind]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sub-tab 3: Logs */}
        {subTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="tonal"
                leadingIcon={<Plus className="w-5 h-5" />}
                onClick={onOpenAddLog}
              >
                Thêm nhật ký
              </Button>
            </div>
            <LogTimeline
              targetId={tree.id}
              allLogs={logs}
              onAddLog={onOpenAddLog}
              onDeleteLog={onDeleteLog}
              onDeleteBatch={onDeleteBatch}
            />
          </div>
        )}

        {/* Sub-tab 4: Ri6 Forecast */}
        {subTab === 'forecast' && (
          <div className="space-y-3">
            {forecastRows.length === 0 ? (
              <EmptyState
                illustration="durian"
                title="Chưa có ngày mắt cua hoặc xổ nhụy"
                description="Nhập ngày mắt cua hoặc ngày xổ nhụy trong hồ sơ cây để app tự tính bảng mốc Kali, lên cơm và ngày thu hoạch Ri6."
                action={
                  <Button
                    variant="filled"
                    size="lg"
                    leadingIcon={<Edit3 className="w-5 h-5" />}
                    onClick={() => setEditOpen(true)}
                  >
                    Nhập ngày xổ nhụy / mắt cua
                  </Button>
                }
              />
            ) : (
              <Card padding="none">
                {forecastRows.map((row, idx) => (
                  <ListItem
                    key={row.key}
                    divider={idx > 0}
                    leadingIcon={<Calendar className="w-5.5 h-5.5" />}
                    leadingTone={row.key === 'thu-hoach' ? 'tc' : 'ok'}
                    title={row.label}
                    subtitle={row.note}
                    trailing={
                      <span className="tabular-nums text-text">
                        {formatMilestoneDates(row)}
                      </span>
                    }
                  />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Inline action bar when embedded in desktop master-detail */}
        {embedded && (
          <div className="pt-2 flex items-center gap-2.5 border-t border-outline">
            <Button
              variant="tonal"
              size="lg"
              leadingIcon={<Copy className="w-5 h-5" />}
              className="whitespace-nowrap shrink-0 px-4"
              onClick={() => {
                void handleCopyPrompt();
              }}
            >
              Copy Prompt
            </Button>
            <Button
              variant="filled"
              size="lg"
              fullWidth
              loading={capturing}
              leadingIcon={<Camera className="w-5 h-5" />}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
            >
              Chụp ảnh tuần
            </Button>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar on mobile (mockup #2) */}
      {!embedded && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/95 backdrop-blur-sm border-t border-outline px-4 pt-3 safe-bottom flex items-center gap-2.5">
          <Button
            variant="tonal"
            size="lg"
            leadingIcon={<Copy className="w-5 h-5" />}
            className="whitespace-nowrap shrink-0 px-4"
            onClick={() => {
              void handleCopyPrompt();
            }}
          >
            Copy Prompt
          </Button>
          <Button
            variant="filled"
            size="lg"
            fullWidth
            loading={capturing}
            leadingIcon={<Camera className="w-5 h-5" />}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            Chụp ảnh tuần
          </Button>
        </div>
      )}

      {/* Manual Copy Prompt fallback Dialog if clipboard permission is blocked */}
      <Dialog
        open={Boolean(fallbackPromptText)}
        title={`Prompt gửi AI · ${tree.code}`}
        subtitle="Chạm vào ô văn bản dưới đây để chọn tất cả và sao chép thủ công"
        onClose={() => setFallbackPromptText(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setFallbackPromptText(null)}>
              Đóng
            </Button>
            <Button
              variant="filled"
              leadingIcon={<Copy className="w-5 h-5" />}
              onClick={async () => {
                if (!fallbackPromptText) return;
                const ok = await copyTextToClipboard(fallbackPromptText);
                if (ok) {
                  triggerHaptic(hapticsEnabled);
                  setFallbackPromptText(null);
                  onNotify(`Đã copy Prompt cho ${tree.code}`, 'ok');
                }
              }}
            >
              Thử sao chép lại
            </Button>
          </>
        }
      >
        <TextField
          label="Nội dung Prompt"
          multiline
          readOnly
          value={fallbackPromptText ?? ''}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-caption"
        />
      </Dialog>

      {/* Edit Tree Profile BottomSheet */}
      <TreeEditSheet
        open={editOpen}
        tree={tree}
        hapticsEnabled={hapticsEnabled}
        onClose={() => setEditOpen(false)}
        onSave={async (patch) => {
          await onUpdateTree(tree, patch);
          onNotify(`Đã cập nhật hồ sơ ${patch.code ?? tree.code}`, 'ok');
        }}
      />

      {/* Confirm soft-delete tree Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        title={`Xóa cây ${tree.code}?`}
        subtitle="Cây sẽ được xóa khỏi danh sách theo dõi. Mã cây đã xóa sẽ không bị tự cấp lại cho cây mới."
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidthClass="max-w-sm"
        footer={
          <>
            <Button variant="text" onClick={() => setDeleteConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteConfirmOpen(false);
                void onDeleteTree(tree);
              }}
            >
              Xóa cây
            </Button>
          </>
        }
      >
        <p>
          Bạn có chắc muốn xóa <strong>{tree.label || tree.code}</strong> khỏi sổ theo dõi không?
        </p>
      </Dialog>

      <PhotoLightbox
        open={Boolean(lightbox)}
        src={lightbox?.src ?? null}
        caption={lightbox?.caption}
        subcaption={lightbox?.subcaption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

interface TreeEditSheetProps {
  open: boolean;
  tree: Tree;
  hapticsEnabled: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Tree>) => Promise<void>;
}

function TreeEditSheet(props: TreeEditSheetProps) {
  if (!props.open) return null;
  return <TreeEditSheetForm {...props} />;
}

function TreeEditSheetForm({ tree, hapticsEnabled, onClose, onSave }: TreeEditSheetProps) {
  const [code, setCode] = useState(tree.code);
  const [label, setLabel] = useState(tree.label);
  const [location, setLocation] = useState(tree.location);
  const [ageText, setAgeText] = useState(tree.ageYears !== null ? String(tree.ageYears) : '');
  const [stage, setStage] = useState<Stage | ''>(tree.stage ?? '');
  const [health, setHealth] = useState<TreeHealth>(tree.health);
  const [needsPruning, setNeedsPruning] = useState(tree.needsPruning);
  const [diseaseWatch, setDiseaseWatch] = useState(tree.diseaseWatch);
  const [budDate, setBudDate] = useState<ISODate | ''>(tree.budDate ?? '');
  const [flowerDate, setFlowerDate] = useState<ISODate | ''>(tree.flowerDate ?? '');
  const [fruitCount, setFruitCount] = useState<number>(tree.fruitCount ?? 0);
  const [hasFruitCount, setHasFruitCount] = useState<boolean>(tree.fruitCount !== undefined);
  const [fruitLimitText, setFruitLimitText] = useState<string>(
    tree.fruitLimit !== undefined ? String(tree.fruitLimit) : '',
  );
  const [note, setNote] = useState(tree.note ?? '');
  const [dirty, setDirty] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setCodeError('Mã cây không được để trống.');
      return;
    }

    const parsedAge = ageText.trim() === '' ? null : Number(ageText.trim());
    const parsedLimit =
      fruitLimitText.trim() === '' ? undefined : Math.max(0, Math.round(Number(fruitLimitText.trim())));

    const patch: Partial<Tree> = {
      code: cleanCode,
      label: label.trim() || cleanCode,
      location: location.trim(),
      ageYears: parsedAge !== null && Number.isFinite(parsedAge) && parsedAge >= 0 ? parsedAge : null,
      stage: stage || null,
      health,
      needsPruning,
      diseaseWatch,
      budDate: budDate || undefined,
      flowerDate: flowerDate || undefined,
      fruitCount: hasFruitCount ? fruitCount : undefined,
      fruitCountDate: hasFruitCount
        ? fruitCount !== tree.fruitCount || !tree.fruitCountDate
          ? todayVN()
          : tree.fruitCountDate
        : undefined,
      fruitLimit: parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      note: note.trim() || undefined,
    };

    setSaving(true);
    try {
      await onSave(patch);
      triggerHaptic(hapticsEnabled);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open
      title={`Sửa hồ sơ · ${tree.code}`}
      dirty={dirty}
      onClose={onClose}
      footer={({ requestClose }) => (
        <>
          <Button variant="text" onClick={requestClose}>
            Hủy
          </Button>
          <Button
            variant="filled"
            size="lg"
            fullWidth
            loading={saving}
            leadingIcon={<Check className="w-5 h-5" />}
            onClick={() => {
              void handleSave();
            }}
          >
            Lưu hồ sơ cây
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label="Mã cây"
            value={code}
            error={codeError}
            onChange={(e) => {
              setCode(e.target.value);
              setDirty(true);
              setCodeError(undefined);
            }}
          />
          <TextField
            label="Tuổi (năm)"
            inputMode="numeric"
            placeholder="Ví dụ: 4"
            value={ageText}
            onChange={(e) => {
              setAgeText(e.target.value);
              setDirty(true);
            }}
          />
        </div>

        <TextField
          label="Tên hiển thị"
          placeholder="Ví dụ: SR03 - Góc giếng"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setDirty(true);
          }}
        />

        <TextField
          label="Vị trí trong vườn"
          placeholder="Ví dụ: Hàng 2, gần giếng khoan"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setDirty(true);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Giai đoạn sinh trưởng"
            value={stage}
            options={STAGE_OPTIONS}
            onChange={(e) => {
              setStage(e.target.value as Stage | '');
              setDirty(true);
            }}
          />
          <SelectField
            label="Tình trạng sức khỏe"
            value={health}
            options={HEALTH_OPTIONS}
            onChange={(e) => {
              setHealth(e.target.value as TreeHealth);
              setDirty(true);
            }}
          />
        </div>

        <div>
          <p className="text-label font-semibold text-text-2 mb-2">Cờ theo dõi nhanh</p>
          <div className="flex flex-wrap gap-2">
            <Chip
              variant="filter"
              selected={needsPruning}
              onClick={() => {
                setNeedsPruning((v) => !v);
                setDirty(true);
              }}
            >
              Cần cắt tỉa
            </Chip>
            <Chip
              variant="filter"
              selected={diseaseWatch}
              onClick={() => {
                setDiseaseWatch((v) => !v);
                setDirty(true);
              }}
            >
              Theo dõi sâu bệnh
            </Chip>
          </div>
        </div>

        {/* Fruit load section (SPEC 1.1: no default fruitLimit!) */}
        <div className="space-y-3 pt-1 border-t border-outline">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label font-semibold text-text-2">Theo dõi tải trái</p>
            <Chip
              variant="filter"
              selected={hasFruitCount}
              onClick={() => {
                setHasFruitCount((v) => !v);
                setDirty(true);
              }}
            >
              {hasFruitCount ? 'Đang đếm trái' : 'Bật đếm trái'}
            </Chip>
          </div>

          {hasFruitCount && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberStepper
                label="Số trái đang mang"
                value={fruitCount}
                min={0}
                max={300}
                unit="trái"
                onChange={(next) => {
                  setFruitCount(next);
                  setDirty(true);
                }}
              />
              <TextField
                label="Giới hạn trái (tùy chọn)"
                inputMode="numeric"
                placeholder="Để trống nếu chưa đặt"
                value={fruitLimitText}
                helperText="Không có mặc định — tùy tán và sức cây"
                onChange={(e) => {
                  setFruitLimitText(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Bud / Flower dates for Ri6 forecast */}
        <div className="space-y-3 pt-1 border-t border-outline">
          <p className="text-label font-semibold text-text-2">Mốc làm bông Ri6 (tùy chọn)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <DateField
                label="Ngày mắt cua"
                value={budDate}
                placeholder="Chưa đặt"
                helperText={budDate ? `Đã đặt: ${formatDateVN(budDate)}` : 'Chưa đặt ngày mắt cua'}
                onChange={(next) => {
                  setBudDate(next);
                  setDirty(true);
                }}
              />
              {budDate && (
                <Button
                  variant="text"
                  onClick={() => {
                    setBudDate('');
                    setDirty(true);
                  }}
                >
                  Xóa ngày mắt cua
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <DateField
                label="Ngày xổ nhụy"
                value={flowerDate}
                placeholder="Chưa đặt"
                helperText={
                  flowerDate ? `Đã đặt: ${formatDateVN(flowerDate)}` : 'Chưa đặt ngày xổ nhụy'
                }
                onChange={(next) => {
                  setFlowerDate(next);
                  setDirty(true);
                }}
              />
              {flowerDate && (
                <Button
                  variant="text"
                  onClick={() => {
                    setFlowerDate('');
                    setDirty(true);
                  }}
                >
                  Xóa ngày xổ nhụy
                </Button>
              )}
            </div>
          </div>
        </div>

        <TextField
          label="Ghi chú hồ sơ"
          multiline
          placeholder="Đặc điểm tán, độ thoát nước, tình trạng rễ…"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDirty(true);
          }}
        />
      </div>
    </BottomSheet>
  );
}
