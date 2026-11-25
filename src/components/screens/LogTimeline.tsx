import {
  AlertTriangle,
  Droplets,
  Ellipsis,
  FlaskConical,
  Flower2,
  Layers,
  Scissors,
  Sparkles,
  SprayCan,
  Sprout,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { batchSize as getBatchSize } from '../../lib/batchLogs';
import { formatDateVN } from '../../lib/date';
import { formatNumberVN, formatShortDateVN } from '../../lib/format';
import { FERT_KIND_LABEL, LOG_TYPE_LABEL } from '../../lib/labels';
import { phiEnd } from '../../lib/phi';
import type { Log, LogType } from '../../types/models';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  LOG_TYPE_TONE,
  ListItem,
  StatusPill,
} from '../ui';

interface LogTimelineProps {
  targetId: string;
  allLogs: Log[];
  onAddLog: () => void;
  onDeleteLog: (log: Log) => void;
  onDeleteBatch: (batchId: string) => void;
}

const LOG_ICONS: Record<LogType, typeof Sprout> = {
  'bon-phan': Sprout,
  'phun-thuoc': SprayCan,
  tuoi: Droplets,
  'do-ph': FlaskConical,
  'cat-tia': Scissors,
  'sau-benh': AlertTriangle,
  'lam-bong': Flower2,
  ai: Sparkles,
  khac: Ellipsis,
};

/**
 * Shared log history timeline used by both individual Tree profiles and Lot A (SPEC M2, T02 AC5).
 * Single-entry delete is immediate with 5s Undo Snackbar; "Xóa cả đợt" confirms via Dialog.
 */
export function LogTimeline({
  targetId,
  allLogs,
  onAddLog,
  onDeleteLog,
  onDeleteBatch,
}: LogTimelineProps) {
  const [confirmBatch, setConfirmBatch] = useState<{ batchId: string; count: number } | null>(null);

  const targetLogs = useMemo(
    () =>
      allLogs
        .filter((l) => !l.deletedAt && l.targetId === targetId)
        .sort((a, b) =>
          a.date === b.date ? b.updatedAt.localeCompare(a.updatedAt) : b.date.localeCompare(a.date),
        ),
    [allLogs, targetId],
  );

  if (targetLogs.length === 0) {
    return (
      <EmptyState
        illustration="logs"
        title="Chưa có nhật ký chăm sóc"
        description="Ghi lại các lần bón phân, phun thuốc, tưới nước hoặc đo pH để theo dõi lịch sử và cảnh báo thời gian cách ly."
        action={
          <Button variant="filled" size="lg" onClick={onAddLog}>
            Ghi nhật ký đầu tiên
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card padding="none">
        {targetLogs.map((log, idx) => {
          const Icon = LOG_ICONS[log.type];
          const countInBatch = log.batchId ? getBatchSize(allLogs, log.batchId) : 1;

          let title = LOG_TYPE_LABEL[log.type];
          if (log.type === 'phun-thuoc') {
            title = `${title} · ${log.activeIngredient?.trim() || 'chưa rõ hoạt chất'}`;
          } else if (log.type === 'bon-phan' && log.fertilizerKind) {
            title = `${title} · ${FERT_KIND_LABEL[log.fertilizerKind]}`;
          } else if (log.type === 'do-ph' && typeof log.soilPh === 'number') {
            title = `${title} · pH ${formatNumberVN(log.soilPh, 1)}`;
          }

          const metaParts: string[] = [formatDateVN(log.date)];
          if (log.type === 'phun-thuoc') {
            const endIso = phiEnd(log);
            if (endIso && typeof log.phiDays === 'number') {
              metaParts.push(`PHI ${log.phiDays} ngày (hết ${formatShortDateVN(endIso)})`);
            } else {
              metaParts.push('PHI chưa rõ');
            }
          }
          if (countInBatch > 1) {
            metaParts.push(`Đợt: ${countInBatch} cây`);
          }
          if (log.note.trim()) {
            metaParts.push(log.note.trim());
          }

          return (
            <div key={log.id} className={idx > 0 ? 'border-t border-surface-2' : ''}>
              <ListItem
                leadingIcon={<Icon className="w-5.5 h-5.5" />}
                leadingTone={LOG_TYPE_TONE[log.type]}
                title={title}
                subtitle={metaParts.join(' · ')}
                trailing={
                  <IconButton
                    label={`Xóa nhật ký ${title}`}
                    onClick={() => onDeleteLog(log)}
                    className="-mr-2 text-text-3 hover:text-danger"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </IconButton>
                }
              />
              {log.batchId && countInBatch > 1 && (
                <div className="px-4 pb-3 -mt-1 flex items-center justify-between gap-2 flex-wrap">
                  <StatusPill tone="info" icon={<Layers className="w-4 h-4" />}>
                    Đợt: {countInBatch} cây
                  </StatusPill>
                  <Button
                    variant="text"
                    onClick={() =>
                      setConfirmBatch({ batchId: log.batchId as string, count: countInBatch })
                    }
                    className="text-danger px-3"
                  >
                    Xóa cả đợt
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Dialog
        open={Boolean(confirmBatch)}
        title="Xóa cả đợt nhật ký?"
        subtitle="Thao tác này sẽ xóa toàn bộ mục cùng đợt trên tất cả cây liên quan."
        onClose={() => setConfirmBatch(null)}
        maxWidthClass="max-w-sm"
        footer={
          <>
            <Button variant="text" onClick={() => setConfirmBatch(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmBatch) {
                  onDeleteBatch(confirmBatch.batchId);
                }
                setConfirmBatch(null);
              }}
            >
              Xóa cả đợt ({confirmBatch?.count ?? 0} cây)
            </Button>
          </>
        }
      >
        <p>
          Bạn có chắc muốn xóa tất cả <strong>{confirmBatch?.count ?? 0} mục nhật ký</strong> thuộc
          đợt này không?
        </p>
      </Dialog>
    </div>
  );
}
