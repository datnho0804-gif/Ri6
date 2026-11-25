import { Check } from 'lucide-react';
import { useState } from 'react';
import { triggerHaptic } from '../../lib/haptics';
import { BottomSheet, Button, SelectField, TextField } from '../ui';

const LOT_OPTIONS = [
  { value: 'B', label: 'Lô B (cây trưởng thành / nuôi trái)' },
  { value: 'A', label: 'Lô A (cây kiến thiết tách theo dõi riêng)' },
];

export interface AddTreeSheetProps {
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

/**
 * Shared "+ Thêm cây" BottomSheet invoked from both OverviewScreen and TreesScreen (T07 AC1).
 */
export function AddTreeSheet(props: AddTreeSheetProps) {
  if (!props.open) return null;
  return <AddTreeSheetForm {...props} />;
}

function AddTreeSheetForm({
  suggestedCode,
  hapticsEnabled,
  onClose,
  onSubmit,
}: AddTreeSheetProps) {
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
