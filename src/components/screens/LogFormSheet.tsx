import {
  AlertTriangle,
  Check,
  Droplets,
  Ellipsis,
  FlaskConical,
  Flower2,
  Plus,
  Scissors,
  SprayCan,
  Sprout,
} from 'lucide-react';
import { useState } from 'react';
import { generateDeviceId } from '../../db/seed';
import { SOIL_PH } from '../../lib/agronomy';
import {
  type BatchResult,
  createBatchLogs,
  LOT_A_TARGET,
  withoutViolations,
} from '../../lib/batchLogs';
import { formatDateVN, nowUTC, todayVN } from '../../lib/date';
import { formatShortDateVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import { FERT_KIND_LABEL, LOG_TYPE_LABEL } from '../../lib/labels';
import type { LimeGapViolation } from '../../lib/logRules';
import { phiEnd } from '../../lib/phi';
import type { FertKind, ISODate, Log, LogType, Tree } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Chip,
  DateField,
  Dialog,
  NumberStepper,
  SelectField,
  TextField,
  TypeTile,
} from '../ui';

export interface LogFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** When provided, locks target to a single tree or LOT_A; otherwise opens batch multi-tree mode. */
  fixedTargetId?: string;
  fixedTargetLabel?: string;
  trees: Tree[];
  lotACount: number;
  existingLogs: Log[];
  deviceId: string;
  hapticsEnabled: boolean;
  onLogsCreated: (logs: Log[], summary: string) => Promise<void> | void;
}

const SINGLE_LOG_OPTIONS: Array<{ id: LogType; label: string; icon: typeof Sprout }> = [
  { id: 'bon-phan', label: 'Bón phân', icon: Sprout },
  { id: 'phun-thuoc', label: 'Phun thuốc', icon: SprayCan },
  { id: 'tuoi', label: 'Tưới', icon: Droplets },
  { id: 'do-ph', label: 'Đo pH', icon: FlaskConical },
  { id: 'cat-tia', label: 'Cắt tỉa', icon: Scissors },
  { id: 'sau-benh', label: 'Sâu bệnh', icon: AlertTriangle },
  { id: 'lam-bong', label: 'Làm bông', icon: Flower2 },
  { id: 'khac', label: 'Khác', icon: Ellipsis },
];

const BATCH_LOG_OPTIONS: Array<{ id: LogType; label: string; icon: typeof Sprout }> = [
  { id: 'bon-phan', label: 'Bón phân', icon: Sprout },
  { id: 'phun-thuoc', label: 'Phun thuốc', icon: SprayCan },
  { id: 'tuoi', label: 'Tưới', icon: Droplets },
  { id: 'do-ph', label: 'Đo pH', icon: FlaskConical },
];

const FERT_OPTIONS = [
  { value: '', label: '— Chọn loại phân (bắt buộc) —' },
  ...(Object.entries(FERT_KIND_LABEL) as Array<[FertKind, string]>).map(([value, label]) => ({
    value,
    label,
  })),
];

export function LogFormSheet(props: LogFormSheetProps) {
  if (!props.open) return null;
  return <LogFormSheetContent {...props} />;
}

function LogFormSheetContent({
  onClose,
  fixedTargetId,
  fixedTargetLabel,
  trees,
  lotACount,
  existingLogs,
  deviceId,
  hapticsEnabled,
  onLogsCreated,
}: LogFormSheetProps) {
  const isBatchMode = !fixedTargetId;
  const lotBIds = trees.filter((t) => t.lot === 'B').map((t) => t.id);

  const [logType, setLogType] = useState<LogType>('bon-phan');
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>(() =>
    isBatchMode ? lotBIds : [fixedTargetId],
  );
  const [includeLotA, setIncludeLotA] = useState(false);

  const [logDate, setLogDate] = useState<ISODate>(() => todayVN());
  const [activeIngredient, setActiveIngredient] = useState('');
  const [phiDays, setPhiDays] = useState(21);
  const [fertilizerKind, setFertilizerKind] = useState<FertKind | ''>('');
  const [soilPhText, setSoilPhText] = useState('5,8');
  const [note, setNote] = useState('');

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [phError, setPhError] = useState<string | undefined>();
  const [ingredientError, setIngredientError] = useState<string | undefined>();
  const [fertError, setFertError] = useState<string | undefined>();

  const [pendingBatch, setPendingBatch] = useState<Extract<BatchResult, { ok: true }> | null>(null);
  const [showIndividualPicker, setShowIndividualPicker] = useState(false);

  const allLotBSelected = lotBIds.length > 0 && lotBIds.every((id) => selectedTreeIds.includes(id));

  const parseSoilPh = (raw: string): number | undefined => {
    const cleaned = raw.trim().replace(',', '.');
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  };

  const handlePhChange = (val: string) => {
    setSoilPhText(val);
    setDirty(true);
    setFormError(undefined);
    const parsed = parseSoilPh(val);
    if (
      parsed === undefined ||
      parsed < SOIL_PH.inputMin ||
      parsed > SOIL_PH.inputMax
    ) {
      setPhError('pH phải từ 3,0 đến 9,0');
    } else {
      setPhError(undefined);
    }
  };

  const toggleTree = (id: string) => {
    setDirty(true);
    setFormError(undefined);
    setSelectedTreeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllLotB = () => {
    setDirty(true);
    setFormError(undefined);
    setSelectedTreeIds((prev) => {
      if (allLotBSelected) {
        return prev.filter((id) => !lotBIds.includes(id));
      }
      return Array.from(new Set([...prev, ...lotBIds]));
    });
  };

  const persistLogs = async (logsToSave: Log[]) => {
    if (logsToSave.length === 0) {
      setPendingBatch(null);
      setFormError('Không còn cây nào sau khi bỏ các cây vi phạm khoảng cách vôi.');
      return;
    }
    setSaving(true);
    try {
      const targetDesc = fixedTargetLabel
        ? fixedTargetLabel
        : logsToSave.length === 1
          ? logsToSave[0].targetId === LOT_A_TARGET
            ? 'Lô A'
            : (trees.find((t) => t.id === logsToSave[0].targetId)?.code ?? '1 cây')
          : `${logsToSave.length} mục`;

      await onLogsCreated(logsToSave, `Đã lưu ${LOG_TYPE_LABEL[logType]} cho ${targetDesc}`);
      triggerHaptic(hapticsEnabled);
      setPendingBatch(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const executeSave = async () => {
    setFormError(undefined);
    setIngredientError(undefined);
    setFertError(undefined);
    setPhError(undefined);

    const parsedPh = logType === 'do-ph' ? parseSoilPh(soilPhText) : undefined;
    const isSingleLotA = fixedTargetId === LOT_A_TARGET;

    const res = createBatchLogs(
      {
        treeIds: fixedTargetId ? (isSingleLotA ? [] : [fixedTargetId]) : selectedTreeIds,
        includeLotA: fixedTargetId ? isSingleLotA : includeLotA,
        date: logDate,
        type: logType,
        note,
        activeIngredient: logType === 'phun-thuoc' ? activeIngredient : undefined,
        phiDays: logType === 'phun-thuoc' ? phiDays : undefined,
        fertilizerKind: logType === 'bon-phan' && fertilizerKind ? fertilizerKind : undefined,
        soilPh: parsedPh,
      },
      {
        existingLogs,
        deviceId,
        now: nowUTC(),
        newId: generateDeviceId,
      },
    );

    if (!res.ok) {
      if (res.errors.activeIngredient) setIngredientError(res.errors.activeIngredient);
      if (res.errors.fertilizerKind) setFertError(res.errors.fertilizerKind);
      if (res.errors.soilPh) setPhError(res.errors.soilPh);
      if (res.errors.targets) setFormError(res.errors.targets);
      else if (res.errors.phiDays) setFormError(res.errors.phiDays);
      else if (res.errors.date) setFormError(res.errors.date);
      return;
    }

    // For single-target logs, omit batchId so it does not show "Đợt: 1 cây"
    const normalizedResult: Extract<BatchResult, { ok: true }> =
      !isBatchMode && res.logs.length === 1
        ? {
            ...res,
            logs: res.logs.map(({ batchId: _b, ...rest }) => {
              void _b;
              return rest;
            }),
          }
        : res;

    if (normalizedResult.limeViolations.length > 0) {
      setPendingBatch(normalizedResult);
      return;
    }

    await persistLogs(normalizedResult.logs);
  };

  const formatViolationReason = (v: LimeGapViolation): string => {
    const label =
      v.targetId === LOT_A_TARGET
        ? 'Lô A'
        : (trees.find((t) => t.id === v.targetId)?.code ?? v.targetId);
    return `${label}: đã bón Vôi/Dolomite ngày ${formatDateVN(v.limeDate)} — cần cách ≥ ${v.gapDays} ngày (sớm nhất ${formatDateVN(v.notBefore)}).`;
  };

  const targetCount = fixedTargetId
    ? 1
    : selectedTreeIds.length + (includeLotA ? 1 : 0);

  const primaryButtonLabel = fixedTargetLabel
    ? `Lưu cho ${fixedTargetLabel}`
    : targetCount === 0
      ? 'Chọn ít nhất 1 cây hoặc Lô A'
      : includeLotA && selectedTreeIds.length > 0
        ? `Lưu cho ${selectedTreeIds.length} cây + Lô A`
        : includeLotA
          ? `Lưu cho Lô A (${lotACount} cây)`
          : `Lưu cho ${selectedTreeIds.length} cây`;

  const phiEndDate = phiEnd({ date: logDate, phiDays }) ?? logDate;
  const options = isBatchMode ? BATCH_LOG_OPTIONS : SINGLE_LOG_OPTIONS;

  const limeViolations = pendingBatch?.limeViolations ?? null;
  const canSkipViolators =
    pendingBatch !== null && withoutViolations(pendingBatch).length > 0;

  return (
    <>
      <BottomSheet
        open
        title={isBatchMode ? 'Ghi nhật ký hàng loạt' : `Ghi nhật ký · ${fixedTargetLabel}`}
        subtitle={
          isBatchMode
            ? 'Tạo nhật ký chung đợt cho nhiều cây cùng lúc'
            : 'Lưu trực tiếp vào sổ theo dõi ngoại tuyến'
        }
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
              disabled={targetCount === 0}
              leadingIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                void executeSave();
              }}
            >
              {primaryButtonLabel}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          {formError && (
            <Banner tone="danger" icon={<AlertTriangle className="w-5 h-5" />}>
              {formError}
            </Banner>
          )}

          <div>
            <p className="text-label font-semibold text-text-2 mb-2">Loại công việc</p>
            <div className={`grid gap-2 ${isBatchMode ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {options.map(({ id, label, icon: Icon }) => (
                <TypeTile
                  key={id}
                  icon={<Icon className="w-5.5 h-5.5" />}
                  label={label}
                  selected={logType === id}
                  onClick={() => {
                    setLogType(id);
                    setDirty(true);
                    setFormError(undefined);
                    setIngredientError(undefined);
                    setFertError(undefined);
                    setPhError(undefined);
                  }}
                />
              ))}
            </div>
          </div>

          {isBatchMode && (
            <div className="space-y-2">
              <p className="text-label font-semibold text-text-2">Áp dụng cho</p>
              <div className="flex flex-wrap gap-2">
                <Chip variant="filter" selected={allLotBSelected} onClick={toggleAllLotB}>
                  Tất cả Lô B · {lotBIds.length} cây
                </Chip>
                <Chip
                  variant="filter"
                  selected={includeLotA}
                  leadingIcon={includeLotA ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  onClick={() => {
                    setIncludeLotA((v) => !v);
                    setDirty(true);
                  }}
                >
                  Kèm Lô A
                </Chip>
                <Chip
                  variant="suggestion"
                  selected={showIndividualPicker}
                  onClick={() => setShowIndividualPicker((v) => !v)}
                >
                  {showIndividualPicker
                    ? 'Thu gọn chọn cây'
                    : `Chọn lẻ (${selectedTreeIds.length})`}
                </Chip>
              </div>
              {showIndividualPicker && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {trees.map((tree) => {
                    const selected = selectedTreeIds.includes(tree.id);
                    return (
                      <Chip
                        key={tree.id}
                        variant="choice"
                        selected={selected}
                        onClick={() => toggleTree(tree.id)}
                        className="px-3"
                      >
                        {tree.code}
                      </Chip>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Type-specific mandatory fields */}
          {logType === 'bon-phan' && (
            <SelectField
              label="Loại phân (bắt buộc)"
              value={fertilizerKind}
              options={FERT_OPTIONS}
              error={fertError}
              helperText="App tự kiểm tra khoảng cách an toàn với Vôi/Dolomite (15 ngày với hữu cơ, 10 ngày với urê/lân)."
              onChange={(e) => {
                setFertilizerKind(e.target.value as FertKind | '');
                setDirty(true);
                setFertError(undefined);
              }}
            />
          )}

          {logType === 'phun-thuoc' && (
            <div className="space-y-3">
              <TextField
                label="Hoạt chất (bắt buộc)"
                placeholder="Ví dụ: Emamectin benzoate (IRAC 6)"
                value={activeIngredient}
                error={ingredientError}
                helperText="Chỉ ghi hoạt chất & nhóm cơ chế FRAC/IRAC · liều lượng theo nhãn."
                onChange={(e) => {
                  setActiveIngredient(e.target.value);
                  setDirty(true);
                  setIngredientError(undefined);
                }}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <DateField
                  label="Ngày phun"
                  value={logDate}
                  onChange={(next) => {
                    setLogDate(next);
                    setDirty(true);
                  }}
                />
                <NumberStepper
                  ariaLabel="Số ngày cách ly PHI"
                  value={phiDays}
                  min={0}
                  max={90}
                  step={1}
                  unit="ngày PHI"
                  onChange={(next) => {
                    setPhiDays(next);
                    setDirty(true);
                  }}
                />
              </div>
              <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
                <span className="tabular-nums">
                  Hết thời gian cách ly ngày <strong>{formatShortDateVN(phiEndDate)}</strong>. Không
                  thu hoạch trước ngày này.
                </span>
              </Banner>
            </div>
          )}

          {logType === 'do-ph' && (
            <div className="space-y-3">
              <TextField
                label="Độ pH đất đo được (bắt buộc)"
                inputMode="decimal"
                placeholder="5,8"
                value={soilPhText}
                error={phError}
                helperText="Nhập từ 3,0 đến 9,0 (mức tối ưu cho đất đỏ bazan Ri6: 5,5–6,5)."
                onChange={(e) => handlePhChange(e.target.value)}
              />
              <DateField
                label="Ngày đo"
                value={logDate}
                onChange={(next) => {
                  setLogDate(next);
                  setDirty(true);
                }}
              />
            </div>
          )}

          {logType !== 'phun-thuoc' && logType !== 'do-ph' && (
            <DateField
              label="Ngày thực hiện"
              value={logDate}
              onChange={(next) => {
                setLogDate(next);
                setDirty(true);
              }}
            />
          )}

          <TextField
            label="Ghi chú thêm"
            multiline
            placeholder="Ghi nhận tình trạng lá, đất, lượng nước hoặc thời tiết…"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
          />
        </div>
      </BottomSheet>

      {/* Single grouped lime-gap violation confirmation Dialog (SPEC M2 & T02 AC5) */}
      <Dialog
        open={Boolean(limeViolations)}
        title="Cảnh báo khoảng cách bón vôi"
        subtitle="Bón quá gần ngày bón vôi làm giảm hiệu quả phân hữu cơ/vi sinh hoặc gây mất đạm, cố định lân."
        onClose={() => setPendingBatch(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setPendingBatch(null)}>
              Hủy
            </Button>
            {canSkipViolators && pendingBatch && (
              <Button
                variant="tonal"
                onClick={() => {
                  void persistLogs(withoutViolations(pendingBatch));
                }}
              >
                Bỏ các cây vi phạm
              </Button>
            )}
            {pendingBatch && (
              <Button
                variant="danger"
                onClick={() => {
                  void persistLogs(pendingBatch.logs);
                }}
              >
                Vẫn lưu
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-2.5">
          <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
            Có <strong>{limeViolations?.length ?? 0}</strong> đối tượng chưa đủ khoảng cách an toàn
            với Vôi/Dolomite:
          </Banner>
          <ul className="list-disc list-inside space-y-1.5 text-body text-text">
            {limeViolations?.map((v) => (
              <li key={v.targetId} className="tabular-nums">
                {formatViolationReason(v)}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
