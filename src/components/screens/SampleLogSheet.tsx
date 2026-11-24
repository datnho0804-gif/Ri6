import {
  AlertTriangle,
  Check,
  Droplets,
  Ellipsis,
  FlaskConical,
  Plus,
  Scissors,
  SprayCan,
  Sprout,
} from 'lucide-react';
import { useState } from 'react';
import { addDays, todayVN } from '../../lib/date';
import { formatShortDateVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import type { ISODate, LogType } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Chip,
  DateField,
  NumberStepper,
  TextField,
  TypeTile,
} from '../ui';

interface SampleLogSheetProps {
  open: boolean;
  onClose: () => void;
  hapticsEnabled: boolean;
  treeCount: number;
  lotACount: number;
  onSaved: (summary: string) => void;
}

const LOG_OPTIONS: Array<{ id: LogType; label: string; icon: typeof Sprout }> = [
  { id: 'bon-phan', label: 'Bón phân', icon: Sprout },
  { id: 'phun-thuoc', label: 'Phun thuốc', icon: SprayCan },
  { id: 'tuoi', label: 'Tưới', icon: Droplets },
  { id: 'do-ph', label: 'Đo pH', icon: FlaskConical },
  { id: 'cat-tia', label: 'Cắt tỉa', icon: Scissors },
  { id: 'khac', label: 'Khác', icon: Ellipsis },
];

/**
 * Sample "Ghi nhật ký" BottomSheet (D01 AC5 & mockup #3).
 * Demonstrates TypeTile grid, target Chips, TextField, DateField, NumberStepper,
 * live PHI warning banner, sticky footer above keyboard, and dirty-form discard guard.
 */
export function SampleLogSheet(props: SampleLogSheetProps) {
  if (!props.open) return null;
  return <SampleLogSheetForm {...props} />;
}

function SampleLogSheetForm({
  onClose,
  hapticsEnabled,
  treeCount,
  lotACount,
  onSaved,
}: SampleLogSheetProps) {
  const [logType, setLogType] = useState<LogType>('phun-thuoc');
  const [includeLotB, setIncludeLotB] = useState(true);
  const [includeLotA, setIncludeLotA] = useState(false);
  const [activeIngredient, setActiveIngredient] = useState('');
  const [logDate, setLogDate] = useState<ISODate>(() => todayVN());
  const [phiDays, setPhiDays] = useState(21);
  const [dirty, setDirty] = useState(false);
  const [ingredientError, setIngredientError] = useState<string | undefined>();

  const selectedTreeTotal = (includeLotB ? treeCount : 0) + (includeLotA ? lotACount : 0);
  const phiEndDate = addDays(logDate, phiDays);
  const targetLabel =
    includeLotB && includeLotA
      ? `${treeCount} cây Lô B + Lô A`
      : includeLotB
        ? `${treeCount} cây`
        : includeLotA
          ? `Lô A (${lotACount} cây)`
          : 'chưa chọn cây';

  const handleSave = () => {
    if (logType === 'phun-thuoc' && activeIngredient.trim().length === 0) {
      setIngredientError('Nhập hoạt chất trước khi lưu nháp phun thuốc.');
      return;
    }
    triggerHaptic(hapticsEnabled);
    onClose();
    const label = LOG_OPTIONS.find((o) => o.id === logType)?.label ?? 'Nhật ký';
    onSaved(`Đã ghi xem trước "${label}" cho ${targetLabel}`);
  };

  return (
    <BottomSheet
      open
      title="Ghi nhật ký"
      subtitle="Bản xem trước — chưa lưu dữ liệu"
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
            disabled={selectedTreeTotal === 0}
            leadingIcon={<Check className="w-5 h-5" />}
            onClick={handleSave}
          >
            {selectedTreeTotal > 0 ? `Lưu xem trước cho ${targetLabel}` : 'Chọn ít nhất 1 lô'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <p className="text-label font-semibold text-text-2 mb-2">Loại công việc</p>
          <div className="grid grid-cols-3 gap-2">
            {LOG_OPTIONS.map(({ id, label, icon: Icon }) => (
              <TypeTile
                key={id}
                icon={<Icon className="w-5.5 h-5.5" />}
                label={label}
                selected={logType === id}
                onClick={() => {
                  setLogType(id);
                  setDirty(true);
                  setIngredientError(undefined);
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-label font-semibold text-text-2 mb-2">Áp dụng cho</p>
          <div className="flex flex-wrap gap-2">
            <Chip
              variant="filter"
              selected={includeLotB}
              onClick={() => {
                setIncludeLotB((prev) => !prev);
                setDirty(true);
              }}
            >
              Tất cả Lô B · {treeCount} cây
            </Chip>
            <Chip
              variant="filter"
              selected={includeLotA}
              leadingIcon={includeLotA ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              onClick={() => {
                setIncludeLotA((prev) => !prev);
                setDirty(true);
              }}
            >
              Kèm Lô A
            </Chip>
          </div>
        </div>

        <div>
          <p className="text-label font-semibold text-text-2 mb-2">
            {logType === 'phun-thuoc' ? 'Hoạt chất & thời gian cách ly' : 'Nội dung ghi chép'}
          </p>
          <TextField
            label={logType === 'phun-thuoc' ? 'Hoạt chất' : 'Ghi chú thao tác'}
            placeholder={
              logType === 'phun-thuoc' ? 'Ví dụ: Emamectin benzoate' : 'Ví dụ: Giữ ẩm gốc bằng béc'
            }
            value={activeIngredient}
            error={ingredientError}
            helperText={
              logType === 'phun-thuoc'
                ? 'Chỉ ghi hoạt chất & nhóm cơ chế FRAC/IRAC · liều lượng theo nhãn'
                : 'Bản xem trước biểu mẫu nhập nhật ký một tay'
            }
            onChange={(e) => {
              setActiveIngredient(e.target.value);
              setDirty(true);
              if (ingredientError) setIngredientError(undefined);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <DateField
            label={logType === 'phun-thuoc' ? 'Ngày phun' : 'Ngày thực hiện'}
            value={logDate}
            onChange={(next) => {
              setLogDate(next);
              setDirty(true);
            }}
          />
          {logType === 'phun-thuoc' && (
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
          )}
        </div>

        {logType === 'phun-thuoc' && (
          <Banner tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
            <span className="tabular-nums">
              Hết PHI <strong>{formatShortDateVN(phiEndDate)}</strong>. Không thu hoạch trước ngày
              này.
            </span>
          </Banner>
        )}
      </div>
    </BottomSheet>
  );
}
