import {
  AlertTriangle,
  Camera,
  Check,
  Edit3,
  Plus,
  Scissors,
  Sprout,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LOT_A_ID } from '../../db/seed';
import { formatDateVN } from '../../lib/date';
import { formatBytesVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import { STAGE_LABEL } from '../../lib/labels';
import type { Log, Lot, Photo, Stage } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  ListItem,
  NumberStepper,
  PhotoLightbox,
  SelectField,
  TextField,
  TopAppBar,
} from '../ui';
import { LogTimeline } from './LogTimeline';

interface LotADetailScreenProps {
  lotA: Lot;
  logs: Log[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  hapticsEnabled: boolean;
  embedded?: boolean;
  onBack?: () => void;
  onUpdateLotA: (patch: { stage?: Stage | null; note?: string }) => Promise<void>;
  onSplitTrees: (count: number) => Promise<{ ok: boolean; error?: string; createdCount: number }>;
  onOpenAddLog: () => void;
  onDeleteLog: (log: Log) => void;
  onDeleteBatch: (batchId: string) => void;
  onCaptureLotPhoto: (file: File) => Promise<void>;
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

/**
 * Lô A management screen sharing LogTimeline with individual trees + "Tách cây khỏi Lô A" (SPEC M2, T02 AC3 & AC5).
 */
export function LotADetailScreen({
  lotA,
  logs,
  photos,
  thumbUrls,
  hapticsEnabled,
  embedded = false,
  onBack,
  onUpdateLotA,
  onSplitTrees,
  onOpenAddLog,
  onDeleteLog,
  onDeleteBatch,
  onCaptureLotPhoto,
  getPhotoFullUrl,
  onEnsureRemotePhoto,
  onNotify,
}: LotADetailScreenProps) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(1);
  const [splitError, setSplitError] = useState<string | undefined>();
  const [splitting, setSplitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [stage, setStage] = useState<Stage | ''>(lotA.stage ?? '');
  const [note, setNote] = useState(lotA.note ?? '');
  const [capturing, setCapturing] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string; subcaption: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lotPhotos = useMemo(
    () =>
      photos
        .filter((p) => !p.deletedAt && p.targetId === LOT_A_ID)
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt)),
    [photos],
  );

  useEffect(() => {
    if (!onEnsureRemotePhoto) return;
    for (const p of lotPhotos) {
      if (p.remotePath && !thumbUrls.has(p.id)) {
        void onEnsureRemotePhoto(p.id);
      }
    }
  }, [lotPhotos, onEnsureRemotePhoto, thumbUrls]);

  const handleConfirmSplit = async () => {
    setSplitError(undefined);
    setSplitting(true);
    try {
      const res = await onSplitTrees(splitCount);
      if (!res.ok) {
        setSplitError(res.error);
        return;
      }
      triggerHaptic(hapticsEnabled);
      setSplitOpen(false);
      onNotify(`Đã tách ${res.createdCount} cây từ Lô A sang theo dõi cá thể.`, 'ok');
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'min-h-dvh bg-bg pb-24'}>
      {!embedded && (
        <TopAppBar
          title="Lô A · Cây kiến thiết"
          subtitle={`Còn ${lotA.treeCount} cây quản lý theo lô`}
          onBack={onBack}
          backLabel="Quay lại danh sách cây"
        />
      )}

      <div className={embedded ? 'space-y-4' : 'max-w-3xl mx-auto px-4 pt-4 space-y-4'}>
        <Card padding="none">
          <ListItem
            leadingIcon={<Sprout className="w-5.5 h-5.5" />}
            leadingTone="tc"
            title={`Lô A — ${lotA.treeCount} cây kiến thiết cơ bản`}
            subtitle={
              lotA.stage
                ? `Giai đoạn: ${STAGE_LABEL[lotA.stage]}${lotA.note ? ` · ${lotA.note}` : ''}`
                : lotA.note || 'Chu kỳ cơi đọt 45–60 ngày · giữ 1 thân thẳng, cành cấp 1 góc 70–90°'
            }
          />
        </Card>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="filled"
            size="lg"
            leadingIcon={<Plus className="w-5 h-5" />}
            onClick={onOpenAddLog}
          >
            Ghi nhật ký Lô A
          </Button>
          <Button
            variant="tonal"
            leadingIcon={<Scissors className="w-5 h-5" />}
            disabled={lotA.treeCount <= 0}
            onClick={() => {
              setSplitCount(1);
              setSplitError(undefined);
              setSplitOpen(true);
            }}
          >
            Tách cây khỏi Lô A
          </Button>
          <Button
            variant="outlined"
            leadingIcon={<Edit3 className="w-5 h-5" />}
            onClick={() => {
              setStage(lotA.stage ?? '');
              setNote(lotA.note ?? '');
              setEditOpen(true);
            }}
          >
            Sửa thông tin lô
          </Button>
          <Button
            variant="outlined"
            loading={capturing}
            leadingIcon={<Camera className="w-5 h-5" />}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            Thêm ảnh Lô A
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Chụp hoặc chọn ảnh Lô A"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setCapturing(true);
            try {
              await onCaptureLotPhoto(file);
            } finally {
              setCapturing(false);
            }
          }}
        />

        {lotPhotos.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-title font-bold text-text px-0.5">Ảnh Lô A</h3>
            <div className="grid grid-cols-3 gap-2">
              {lotPhotos.map((p) => {
                const thumb = thumbUrls.get(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`Xem ảnh Lô A ngày ${formatDateVN(p.takenAt)}`}
                    onClick={async () => {
                      const url = await getPhotoFullUrl(p.id);
                      if (url) {
                        setLightbox({
                          src: url,
                          caption: `Ảnh Lô A · ${formatDateVN(p.takenAt)}`,
                          subcaption: `${p.width}×${p.height} · ${formatBytesVN(p.bytes)}`,
                        });
                      } else {
                        onNotify(
                          'Ảnh chưa có trên máy này. Hãy kết nối mạng để tải từ GitHub.',
                          'warn',
                        );
                      }
                    }}
                    className="pressable aspect-square min-w-12 min-h-12 rounded-md overflow-hidden bg-surface-2 shadow-e1"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={`Ảnh Lô A ngày ${formatDateVN(p.takenAt)}`}
                        width={480}
                        height={480}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 text-center text-caption font-medium text-text-2">
                        <Camera className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="leading-tight">
                          {p.remotePath ? 'Mở để tải ảnh' : 'Chưa có ảnh'}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-title font-bold text-text px-0.5">Nhật ký chăm sóc Lô A</h3>
          <LogTimeline
            targetId={LOT_A_ID}
            allLogs={logs}
            onAddLog={onOpenAddLog}
            onDeleteLog={onDeleteLog}
            onDeleteBatch={onDeleteBatch}
          />
        </section>
      </div>

      {/* Split trees from Lot A BottomSheet */}
      <BottomSheet
        open={splitOpen}
        title="Tách cây khỏi Lô A"
        subtitle={`Hiện còn ${lotA.treeCount} cây trong Lô A. Cây tách ra giữ nhãn Lô A và được theo dõi riêng.`}
        onClose={() => setSplitOpen(false)}
        footer={({ requestClose }) => (
          <>
            <Button variant="text" onClick={requestClose}>
              Hủy
            </Button>
            <Button
              variant="filled"
              size="lg"
              fullWidth
              loading={splitting}
              leadingIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                void handleConfirmSplit();
              }}
            >
              Tách {splitCount} cây sang cá thể
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <NumberStepper
            label="Số cây cần tách"
            value={splitCount}
            min={1}
            max={Math.max(1, lotA.treeCount)}
            unit="cây"
            error={splitError}
            helperText={`Sau khi tách, Lô A còn ${Math.max(0, lotA.treeCount - splitCount)} cây và tự ghi 1 nhật ký lưu vết.`}
            onChange={(next) => {
              setSplitCount(next);
              setSplitError(undefined);
            }}
          />
          {splitCount > lotA.treeCount && (
            <Banner tone="danger" icon={<AlertTriangle className="w-5 h-5" />}>
              Không thể tách nhiều hơn số cây hiện có ({lotA.treeCount} cây).
            </Banner>
          )}
        </div>
      </BottomSheet>

      {/* Edit Lot A info BottomSheet */}
      <BottomSheet
        open={editOpen}
        title="Sửa thông tin Lô A"
        onClose={() => setEditOpen(false)}
        footer={({ requestClose }) => (
          <>
            <Button variant="text" onClick={requestClose}>
              Hủy
            </Button>
            <Button
              variant="filled"
              size="lg"
              fullWidth
              onClick={async () => {
                await onUpdateLotA({ stage: stage || null, note: note.trim() || undefined });
                triggerHaptic(hapticsEnabled);
                setEditOpen(false);
                onNotify('Đã cập nhật thông tin Lô A.', 'ok');
              }}
            >
              Lưu Lô A
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <SelectField
            label="Giai đoạn hiện tại của Lô A"
            value={stage}
            options={STAGE_OPTIONS}
            onChange={(e) => setStage(e.target.value as Stage | '')}
          />
          <TextField
            label="Ghi chú Lô A"
            multiline
            placeholder="Ví dụ: Tủ gốc dày 15 cm, 1 béc tưới cách gốc 45 cm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </BottomSheet>

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
