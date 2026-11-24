import { AlertTriangle, Camera, CheckCircle2, Clock } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { todayVN } from '../../lib/date';
import { formatRelativeDateVN } from '../../lib/format';
import { lastWeeklyByTarget, photoStatus } from '../../lib/photoStatus';
import type { Photo, Tree } from '../../types/models';
import { BottomSheet, Button, Card, ListItem, StatusPill } from '../ui';

interface QuickPhotoSheetProps {
  open: boolean;
  onClose: () => void;
  trees: Tree[];
  photos: Photo[];
  onCapturePhoto: (tree: Tree, file: File) => Promise<void>;
}

/**
 * Direct weekly photo capture picker triggered by PWA shortcut `#/photo` (T02 AC0).
 * Prioritizes overdue and due-soon trees so farmers tap once to launch camera.
 */
export function QuickPhotoSheet({
  open,
  onClose,
  trees,
  photos,
  onCapturePhoto,
}: QuickPhotoSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);

  const today = todayVN();
  const latestMap = useMemo(() => lastWeeklyByTarget(photos), [photos]);

  const sortedTrees = useMemo(() => {
    const rank = { overdue: 0, 'due-soon': 1, ok: 2 } as const;
    return [...trees].sort((a, b) => {
      const sa = photoStatus(latestMap.get(a.id), today);
      const sb = photoStatus(latestMap.get(b.id), today);
      if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
      return a.code.localeCompare(b.code, 'vi', { numeric: true });
    });
  }, [latestMap, today, trees]);

  const handlePickTree = (tree: Tree) => {
    setSelectedTree(tree);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file || !selectedTree) return;
    setCapturingId(selectedTree.id);
    try {
      await onCapturePhoto(selectedTree, file);
      onClose();
    } finally {
      setCapturingId(null);
      setSelectedTree(null);
    }
  };

  return (
    <BottomSheet
      open={open}
      title="Chụp ảnh tuần"
      subtitle="Chọn cây cần chụp để mở thẳng máy ảnh (ưu tiên cây quá hạn lên đầu)"
      onClose={onClose}
      footer={
        <Button variant="text" fullWidth onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Chọn hoặc chụp ảnh tuần cho cây"
        onChange={(e) => {
          void handleFileChange(e.target.files?.[0]);
        }}
      />

      <Card padding="none">
        {sortedTrees.map((tree, idx) => {
          const lastDate = latestMap.get(tree.id);
          const status = photoStatus(lastDate, today);
          const tone = status === 'ok' ? 'ok' : status === 'due-soon' ? 'warn' : 'danger';
          const statusText =
            status === 'ok'
              ? lastDate
                ? formatRelativeDateVN(lastDate, today)
                : 'Đã chụp'
              : status === 'due-soon'
                ? 'Sắp hạn'
                : 'Quá hạn';
          const icon =
            status === 'ok' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : status === 'due-soon' ? (
              <Clock className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            );

          return (
            <ListItem
              key={tree.id}
              divider={idx > 0}
              leadingIcon={<Camera className="w-5.5 h-5.5" />}
              leadingTone={tone}
              title={tree.label || tree.code}
              subtitle={
                capturingId === tree.id
                  ? 'Đang nén và lưu ảnh…'
                  : lastDate
                    ? `Ảnh gần nhất: ${formatRelativeDateVN(lastDate, today)}`
                    : 'Chưa có ảnh gốc — bấm để chụp'
              }
              trailing={
                <StatusPill tone={tone} icon={icon}>
                  {statusText}
                </StatusPill>
              }
              onClick={() => handlePickTree(tree)}
            />
          );
        })}
      </Card>
    </BottomSheet>
  );
}
