import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  Plus,
  Scissors,
  Sprout,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { LOT_A_ID } from '../../db/seed';
import { getLatestWeeklyPhotoRecords } from '../../hooks/treePresentation';
import { todayVN } from '../../lib/date';
import { formatRelativeDateVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import { STAGE_LABEL } from '../../lib/labels';
import { lastWeeklyByTarget, photoStatus } from '../../lib/photoStatus';
import { duplicateCodes, nextTreeCode } from '../../lib/treeCodes';
import { filterTrees, type TreeFilter } from '../../lib/treeFilters';
import type { Log, Lot, Photo, Season, Stage, Tree } from '../../types/models';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ListItem,
  SelectField,
  StatusPill,
  TextField,
} from '../ui';
import { LotADetailScreen } from './LotADetailScreen';
import { TreeProfileScreen } from './TreeProfileScreen';

interface TreesScreenProps {
  trees: Tree[];
  allTrees: Tree[];
  lotA: Lot | null;
  logs: Log[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  season: Season;
  hapticsEnabled: boolean;
  initialFilter?: TreeFilter;
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string | null) => void;
  onAddTree: (input: {
    code: string;
    lot: 'A' | 'B';
    label: string;
    location: string;
    ageYears: number | null;
  }) => Promise<Tree>;
  onUpdateTree: (tree: Tree, patch: Partial<Tree>) => Promise<Tree>;
  onDeleteTree: (tree: Tree) => Promise<void>;
  onUpdateLotA: (patch: { stage?: Stage | null; note?: string }) => Promise<void>;
  onSplitFromLotA: (count: number) => Promise<{ ok: boolean; error?: string; createdCount: number }>;
  onOpenBatchLog: () => void;
  onOpenSingleLog: (targetId: string, targetLabel: string) => void;
  onDeleteLog: (log: Log) => void;
  onDeleteBatch: (batchId: string) => void;
  onCaptureWeeklyPhoto: (tree: Tree, file: File) => Promise<void>;
  onCaptureLotAPhoto: (file: File) => Promise<void>;
  getPhotoFullUrl: (photoId: string) => Promise<string | null>;
  onEnsureRemotePhoto?: (photoId: string) => Promise<void>;
  canUseAi?: boolean;
  onAskAiAboutTree?: (tree: Tree, initialPhotoIds: string[]) => void;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

const FILTER_CHIPS: Array<{ id: TreeFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'need-photo', label: 'Cần chụp tuần này' },
  { id: 'need-pruning', label: 'Cần cắt tỉa' },
  { id: 'disease-watch', label: 'Theo dõi sâu bệnh' },
];

const LOT_OPTIONS = [
  { value: 'B', label: 'Lô B (cây trưởng thành / nuôi trái)' },
  { value: 'A', label: 'Lô A (cây kiến thiết tách theo dõi riêng)' },
];

/**
 * M2 Trees List & Desktop 2-Column Master-Detail Screen (SPEC M2, DESIGN §3, T02 AC3).
 */
export function TreesScreen({
  trees,
  allTrees,
  lotA,
  logs,
  photos,
  thumbUrls,
  season,
  hapticsEnabled,
  initialFilter = 'all',
  selectedTargetId,
  onSelectTarget,
  onAddTree,
  onUpdateTree,
  onDeleteTree,
  onUpdateLotA,
  onSplitFromLotA,
  onOpenBatchLog,
  onOpenSingleLog,
  onDeleteLog,
  onDeleteBatch,
  onCaptureWeeklyPhoto,
  onCaptureLotAPhoto,
  getPhotoFullUrl,
  onEnsureRemotePhoto,
  canUseAi,
  onAskAiAboutTree,
  onNotify,
}: TreesScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TreeFilter>(initialFilter);
  const [addOpen, setAddOpen] = useState(false);

  const today = todayVN();
  const lastWeeklyDates = useMemo(() => lastWeeklyByTarget(photos), [photos]);
  const latestWeeklyPhotos = useMemo(() => getLatestWeeklyPhotoRecords(photos), [photos]);

  const dupes = useMemo(() => duplicateCodes(allTrees), [allTrees]);

  const filteredTrees = useMemo(
    () => filterTrees(trees, { query, filter }, { lastWeekly: lastWeeklyDates, today }),
    [filter, lastWeeklyDates, query, today, trees],
  );

  // Desktop master-detail right panel selection (defaults to first tree if none chosen)
  const effectiveDesktopTargetId =
    selectedTargetId ?? (filteredTrees[0]?.id ?? (lotA ? LOT_A_ID : null));
  const selectedTree = useMemo(
    () => trees.find((t) => t.id === effectiveDesktopTargetId) ?? null,
    [effectiveDesktopTargetId, trees],
  );

  return (
    <div className="rail:grid rail:grid-cols-12 rail:gap-5 items-start">
      {/* Left column: Search, Filters, Actions, Lô A card, and Trees list */}
      <div className="rail:col-span-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="filled"
            leadingIcon={<Plus className="w-5 h-5" />}
            onClick={() => setAddOpen(true)}
          >
            Thêm cây
          </Button>
          <Button
            variant="tonal"
            leadingIcon={<Layers className="w-5 h-5" />}
            onClick={onOpenBatchLog}
          >
            Ghi hàng loạt
          </Button>
        </div>

        <TextField
          label="Tìm cây"
          placeholder="Nhập mã SR01, tên hoặc vị trí…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Bộ lọc danh sách cây">
          {FILTER_CHIPS.map((c) => (
            <Chip
              key={c.id}
              variant="filter"
              selected={filter === c.id}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        {/* Lô A Card */}
        {lotA && (
          <Card
            padding="none"
            className={
              selectedTargetId === LOT_A_ID ? 'ring-2 ring-primary' : ''
            }
          >
            <ListItem
              leadingIcon={<Sprout className="w-5.5 h-5.5" />}
              leadingTone="tc"
              title={`Lô A · ${lotA.treeCount} cây kiến thiết`}
              subtitle={
                lotA.stage
                  ? `Giai đoạn: ${STAGE_LABEL[lotA.stage]} · bấm xem nhật ký hoặc tách cây`
                  : 'Quản lý theo lô · bấm xem nhật ký hoặc tách cây sang cá thể'
              }
              showChevron
              onClick={() => onSelectTarget(LOT_A_ID)}
            />
          </Card>
        )}

        {/* Individual trees list */}
        {filteredTrees.length === 0 ? (
          <EmptyState
            illustration="durian"
            title="Không tìm thấy cây phù hợp"
            description="Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả để xem toàn bộ vườn."
            action={
              <Button
                variant="outlined"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Xem tất cả cây
              </Button>
            }
          />
        ) : (
          <Card padding="none">
            {filteredTrees.map((tree, idx) => {
              const latestPhoto = latestWeeklyPhotos.get(tree.id);
              const lastDate = lastWeeklyDates.get(tree.id);
              const thumbSrc = latestPhoto ? thumbUrls.get(latestPhoto.id) : undefined;
              const st = photoStatus(lastDate, today);
              const tone = st === 'ok' ? 'ok' : st === 'due-soon' ? 'warn' : 'danger';
              const isDupe = dupes.has(tree.code.trim().toUpperCase());
              const isSelected = effectiveDesktopTargetId === tree.id;

              const subtitleParts: string[] = [`Lô ${tree.lot}`];
              if (tree.location) subtitleParts.push(tree.location);
              if (tree.stage) subtitleParts.push(STAGE_LABEL[tree.stage]);
              if (lastDate) {
                subtitleParts.push(`Ảnh: ${formatRelativeDateVN(lastDate, today)}`);
              }

              return (
                <div
                  key={tree.id}
                  className={[
                    idx > 0 ? 'border-t border-surface-2' : '',
                    isSelected ? 'rail:bg-primary-container/35' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <ListItem
                    leadingIcon={
                      thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          decoding="async"
                          className="w-11 h-11 rounded-tile object-cover"
                        />
                      ) : (
                        <Camera className="w-5.5 h-5.5" />
                      )
                    }
                    leadingTone={thumbSrc ? 'neutral' : tone}
                    title={tree.label || tree.code}
                    subtitle={subtitleParts.join(' · ')}
                    showChevron
                    onClick={() => onSelectTarget(tree.id)}
                  />
                  <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
                    <StatusPill
                      tone={tone}
                      icon={
                        st === 'ok' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : st === 'due-soon' ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )
                      }
                    >
                      {st === 'ok' ? 'Đã chụp' : st === 'due-soon' ? 'Sắp hạn' : 'Quá hạn'}
                    </StatusPill>
                    {isDupe && (
                      <StatusPill tone="danger" icon={<AlertTriangle className="w-4 h-4" />}>
                        Trùng mã
                      </StatusPill>
                    )}
                    {tree.needsPruning && (
                      <StatusPill tone="sec" icon={<Scissors className="w-4 h-4" />}>
                        Cần cắt tỉa
                      </StatusPill>
                    )}
                    {(tree.diseaseWatch || tree.health === 'benh') && (
                      <StatusPill tone="warn" icon={<Eye className="w-4 h-4" />}>
                        Theo dõi bệnh
                      </StatusPill>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {/* Right column: Desktop/Tablet (>=840px) embedded detail pane (DESIGN §3) */}
      <div className="hidden rail:block rail:col-span-7 sticky top-20">
        {effectiveDesktopTargetId === LOT_A_ID && lotA ? (
          <LotADetailScreen
            embedded
            lotA={lotA}
            logs={logs}
            photos={photos}
            thumbUrls={thumbUrls}
            hapticsEnabled={hapticsEnabled}
            onUpdateLotA={onUpdateLotA}
            onSplitTrees={onSplitFromLotA}
            onOpenAddLog={() => onOpenSingleLog(LOT_A_ID, 'Lô A')}
            onDeleteLog={onDeleteLog}
            onDeleteBatch={onDeleteBatch}
            onCaptureLotPhoto={onCaptureLotAPhoto}
            getPhotoFullUrl={getPhotoFullUrl}
            onEnsureRemotePhoto={onEnsureRemotePhoto}
            onNotify={onNotify}
          />
        ) : selectedTree ? (
          <TreeProfileScreen
            embedded
            tree={selectedTree}
            duplicateCodeSet={dupes}
            logs={logs}
            photos={photos}
            thumbUrls={thumbUrls}
            season={season}
            hapticsEnabled={hapticsEnabled}
            onUpdateTree={onUpdateTree}
            onDeleteTree={async (t) => {
              await onDeleteTree(t);
              onSelectTarget(null);
            }}
            onOpenAddLog={() => onOpenSingleLog(selectedTree.id, selectedTree.code)}
            onDeleteLog={onDeleteLog}
            onDeleteBatch={onDeleteBatch}
            onCaptureWeeklyPhoto={onCaptureWeeklyPhoto}
            getPhotoFullUrl={getPhotoFullUrl}
            onEnsureRemotePhoto={onEnsureRemotePhoto}
            canUseAi={canUseAi}
            onAskAiAboutTree={onAskAiAboutTree}
            onNotify={onNotify}
          />
        ) : (
          <EmptyState
            illustration="durian"
            title="Chọn một cây để xem hồ sơ"
            description="Chạm vào bất kỳ cây nào ở danh sách bên trái để xem ảnh tuần, tiến độ nuôi trái Ri6 và nhật ký chăm sóc."
          />
        )}
      </div>

      {/* "+ Thêm cây" BottomSheet */}
      <AddTreeSheet
        open={addOpen}
        suggestedCode={nextTreeCode(allTrees)}
        hapticsEnabled={hapticsEnabled}
        onClose={() => setAddOpen(false)}
        onSubmit={async (data) => {
          const created = await onAddTree(data);
          onSelectTarget(created.id);
          onNotify(`Đã thêm cây ${created.code}`, 'ok');
        }}
      />
    </div>
  );
}

interface AddTreeSheetProps {
  open: boolean;
  suggestedCode: string;
  hapticsEnabled: boolean;
  onClose: () => void;
  onSubmit: (input: {
    code: string;
    lot: 'A' | 'B';
    label: string;
    location: string;
    ageYears: number | null;
  }) => Promise<void>;
}

function AddTreeSheet(props: AddTreeSheetProps) {
  if (!props.open) return null;
  return <AddTreeSheetForm {...props} />;
}

function AddTreeSheetForm({ suggestedCode, hapticsEnabled, onClose, onSubmit }: AddTreeSheetProps) {
  const [code, setCode] = useState(suggestedCode);
  const [lot, setLot] = useState<'A' | 'B'>('B');
  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');
  const [ageText, setAgeText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setCodeError('Nhập mã cây trước khi lưu.');
      return;
    }
    const ageNum = ageText.trim() === '' ? null : Number(ageText.trim());
    setSaving(true);
    try {
      await onSubmit({
        code: cleanCode,
        lot,
        label: label.trim() || (location.trim() ? `${cleanCode} - ${location.trim()}` : cleanCode),
        location: location.trim(),
        ageYears: ageNum !== null && Number.isFinite(ageNum) && ageNum >= 0 ? ageNum : null,
      });
      triggerHaptic(hapticsEnabled);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open
      title="Thêm cây mới"
      subtitle="Mã tự gợi ý nối tiếp, không cấp lại mã đã xóa"
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
            Thêm cây {code.trim() || ''}
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
            label="Tuổi cây (năm)"
            inputMode="numeric"
            placeholder="Ví dụ: 3"
            value={ageText}
            onChange={(e) => {
              setAgeText(e.target.value);
              setDirty(true);
            }}
          />
        </div>

        <SelectField
          label="Thuộc lô"
          value={lot}
          options={LOT_OPTIONS}
          onChange={(e) => {
            setLot(e.target.value as 'A' | 'B');
            setDirty(true);
          }}
        />

        <TextField
          label="Vị trí trong vườn"
          placeholder="Ví dụ: Góc cổng, gần đường mương"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setDirty(true);
          }}
        />

        <TextField
          label="Tên hiển thị (tùy chọn)"
          placeholder={`Mặc định: ${code.trim() || suggestedCode}`}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setDirty(true);
          }}
        />
      </div>
    </BottomSheet>
  );
}
