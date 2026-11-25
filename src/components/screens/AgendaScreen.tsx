import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Sprout,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LOT_A_ID } from '../../db/seed';
import {
  type AgendaItem,
  type AgendaPriority,
  groupAgenda,
} from '../../lib/agenda/agenda';
import { agendaItemCalendarUrl, weeklyPhotoReminderUrl } from '../../lib/agenda/calendar';
import {
  enableAgendaReminders,
  notifyCapability,
  type NotifyCapability,
} from '../../lib/agenda/register';
import { formatDateVN, todayVN } from '../../lib/date';
import { triggerHaptic } from '../../lib/haptics';
import { harvestWindow } from '../../lib/ri6';
import type { ISODate, Settings, Tree } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  DateField,
  EmptyState,
  SelectField,
  StatusPill,
  TextField,
  type SemanticTone,
} from '../ui';

interface AgendaScreenProps {
  items: AgendaItem[];
  trees: Tree[];
  settings: Settings | null;
  hapticsEnabled: boolean;
  onMarkDone: (item: AgendaItem) => Promise<void>;
  onSnooze: (item: AgendaItem) => Promise<void>;
  onAddManualTask: (input: { title: string; dueDate: ISODate; targetId?: string }) => Promise<void>;
  onSelectTarget: (targetId: string) => void;
  onUpdateSettings: (patch: Partial<Settings>) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

const PRIORITY_META: Record<
  AgendaPriority,
  { label: string; tone: SemanticTone; icon: typeof AlertTriangle }
> = {
  cao: { label: 'Ưu tiên cao', tone: 'danger', icon: AlertTriangle },
  vua: { label: 'Ưu tiên vừa', tone: 'warn', icon: Clock },
  thap: { label: 'Nhắc nhẹ', tone: 'info', icon: CheckCircle2 },
};

/**
 * M6 Agenda & Reminders screen (SPEC M6, T05 AC2, AC4, AC5):
 * - 3 groups: Quá hạn / Hôm nay / 7 ngày tới
 * - Actions: Xong (or Chụp ảnh for weekly photos), Hoãn 1 ngày, Thêm vào Google Calendar
 * - Manual task creation sheet & weekly recurring Google Calendar photo reminder
 * - Explicit "Bật nhắc nhở" button (never asks Notification permission on mount)
 */
export function AgendaScreen({
  items,
  trees,
  settings,
  hapticsEnabled,
  onMarkDone,
  onSnooze,
  onAddManualTask,
  onSelectTarget,
  onUpdateSettings,
  onNotify,
}: AgendaScreenProps) {
  const today = todayVN();
  const [addOpen, setAddOpen] = useState(false);
  const [enablingNotify, setEnablingNotify] = useState(false);
  const [capability, setCapability] = useState<NotifyCapability | null>(null);

  useEffect(() => {
    let active = true;
    void notifyCapability().then((cap) => {
      if (active) setCapability(cap);
    });
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => groupAgenda(items, today), [items, today]);
  const treeMap = useMemo(() => new Map(trees.map((t) => [t.id, t])), [trees]);
  const weeklyCalUrl = useMemo(() => weeklyPhotoReminderUrl(today), [today]);

  const notifyActive = Boolean(settings?.notify?.enabled && capability?.permission === 'granted');

  const handleEnableReminders = async () => {
    setEnablingNotify(true);
    try {
      const res = await enableAgendaReminders();
      const cap = await notifyCapability();
      setCapability(cap);
      if (res.permission === 'granted') {
        await onUpdateSettings({
          notify: {
            enabled: true,
            lastNotifiedAt: settings?.notify?.lastNotifiedAt,
            lastKeys: settings?.notify?.lastKeys ?? [],
          },
        });
        triggerHaptic(hapticsEnabled);
        onNotify(
          res.periodic
            ? 'Đã bật nhắc nhở hằng ngày (đồng bộ nền ri6-agenda).'
            : 'Đã bật quyền thông báo. Với mốc quan trọng hãy bấm Thêm vào Google Calendar để chắc chắn có chuông báo.',
          'ok',
        );
      } else if (res.permission === 'denied') {
        onNotify('Bạn đã chặn quyền thông báo trên trình duyệt. Có thể mở lại trong Cài đặt Chrome.', 'warn');
      } else {
        onNotify('Trình duyệt hiện tại không hỗ trợ thông báo đẩy — hãy dùng Google Calendar.', 'info');
      }
    } finally {
      setEnablingNotify(false);
    }
  };

  const getCalendarHref = (item: AgendaItem): string => {
    if (item.key.startsWith('ri6-thu-hoach:') && item.targetId) {
      const tree = treeMap.get(item.targetId);
      if (tree?.flowerDate) {
        return agendaItemCalendarUrl(item, harvestWindow(tree.flowerDate));
      }
    }
    return agendaItemCalendarUrl(item);
  };

  const renderGroup = (
    headingId: string,
    title: string,
    tone: SemanticTone,
    list: AgendaItem[],
  ) => {
    if (list.length === 0) return null;
    return (
      <section aria-labelledby={headingId} className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 id={headingId} className="text-title font-bold text-text">
            {title}
          </h2>
          <StatusPill
            tone={tone}
            icon={
              tone === 'danger' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : tone === 'warn' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )
            }
          >
            {list.length} việc
          </StatusPill>
        </div>

        <div className="space-y-2.5">
          {list.map((item) => {
            const prio = PRIORITY_META[item.priority];
            const PrioIcon = prio.icon;
            const targetTree = item.targetId ? treeMap.get(item.targetId) : undefined;
            const targetLabel =
              item.targetId === LOT_A_ID
                ? 'Lô A'
                : targetTree
                  ? targetTree.code
                  : undefined;
            const isPhotoTask = item.category === 'photo';
            const calHref = getCalendarHref(item);

            return (
              <Card key={item.key} padding="md" className="space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-body font-bold text-text leading-snug">{item.title}</h3>
                    <p className="text-caption text-text-2 leading-relaxed">{item.reason}</p>
                  </div>
                  <StatusPill tone={prio.tone} icon={<PrioIcon className="w-4 h-4" />}>
                    {prio.label}
                  </StatusPill>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-caption text-text-3 tabular-nums">
                  <span className="inline-flex items-center gap-1 font-medium text-text-2">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    {item.ongoing ? `Đang diễn ra · đến ${formatDateVN(item.dueDate)}` : `Hạn ${formatDateVN(item.dueDate)}`}
                  </span>
                  {item.source === 'manual' && (
                    <StatusPill tone="neutral">Tự thêm</StatusPill>
                  )}
                  {item.source === 'ai' && (
                    <StatusPill tone="info">AI gợi ý</StatusPill>
                  )}
                  {targetLabel && item.targetId && (
                    <Button
                      variant="text"
                      leadingIcon={<Sprout className="w-4 h-4" />}
                      onClick={() => onSelectTarget(item.targetId!)}
                      className="px-2.5"
                    >
                      Mở {targetLabel}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-2">
                  {isPhotoTask && item.targetId ? (
                    <Button
                      variant="filled"
                      leadingIcon={<Camera className="w-5 h-5" />}
                      onClick={() => onSelectTarget(item.targetId!)}
                    >
                      Chụp ảnh
                    </Button>
                  ) : (
                    <Button
                      variant="filled"
                      leadingIcon={<Check className="w-5 h-5" />}
                      onClick={() => {
                        void onMarkDone(item);
                      }}
                    >
                      Xong
                    </Button>
                  )}
                  <Button
                    variant="tonal"
                    leadingIcon={<Clock className="w-5 h-5" />}
                    onClick={() => {
                      void onSnooze(item);
                    }}
                  >
                    Hoãn 1 ngày
                  </Button>
                  <a
                    href={calHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pressable inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-pill border border-outline-strong bg-surface text-primary text-body font-semibold hover:bg-surface-2"
                  >
                    <CalendarPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>Lịch Google</span>
                    <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top actions: Add manual task & Weekly Google Calendar recurring photo reminder */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="filled"
            size="lg"
            leadingIcon={<Plus className="w-5 h-5" />}
            onClick={() => setAddOpen(true)}
          >
            Thêm việc mới
          </Button>
          <a
            href={weeklyCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable inline-flex items-center justify-center gap-2 min-h-14 px-5 rounded-pill bg-primary-container text-on-primary-container text-body font-semibold"
          >
            <CalendarPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Tạo nhắc chụp ảnh hằng tuần</span>
            <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
          </a>
        </div>
        <p className="text-caption text-text-3 leading-relaxed">
          Mẹo Google Calendar: liên kết đã gắn lặp hằng tuần (RRULE). Nếu ứng dụng Lịch trên điện
          thoại chưa tự bật lặp, bạn chỉ cần chọn <strong>Lặp lại hằng tuần</strong> trước khi lưu.
        </p>
      </Card>

      {/* Explicit Notification opt-in banner (SPEC M6 & T05 AC5: never asks on mount) */}
      {!notifyActive && (
        <Banner
          tone="info"
          icon={<Bell className="w-5 h-5" />}
          title="Nhắc việc tự động trên điện thoại"
          action={
            <Button
              variant="filled"
              loading={enablingNotify}
              leadingIcon={<Bell className="w-5 h-5" />}
              onClick={() => {
                void handleEnableReminders();
              }}
            >
              Bật nhắc nhở
            </Button>
          }
        >
          Tối đa 1 thông báo tổng hợp mỗi ngày (không làm phiền từ 21:00–06:00). Với mốc thu hoạch,
          PHI hay bón vôi quan trọng, nên bấm thêm <strong>Lịch Google</strong> để chắc chắn có
          chuông báo.
        </Banner>
      )}

      {/* 3 Agenda groups: Overdue / Today / Next 7 days */}
      {items.length === 0 ? (
        <EmptyState
          illustration="durian"
          title="Không có việc tồn đọng trong 7 ngày tới"
          description="Mọi cây đều đã cập nhật tốt. Bạn vẫn có thể bấm Thêm việc mới để ghi nhớ việc riêng ngoài vườn."
          action={
            <Button
              variant="filled"
              leadingIcon={<Plus className="w-5 h-5" />}
              onClick={() => setAddOpen(true)}
            >
              Thêm việc mới
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {renderGroup('agenda-overdue', 'Quá hạn', 'danger', groups.overdue)}
          {renderGroup('agenda-today', 'Hôm nay', 'warn', groups.today)}
          {renderGroup('agenda-upcoming', '7 ngày tới', 'info', groups.upcoming)}
        </div>
      )}

      {/* Add Manual Task BottomSheet */}
      {addOpen && (
        <AddTaskSheet
          trees={trees}
          hapticsEnabled={hapticsEnabled}
          onClose={() => setAddOpen(false)}
          onSubmit={async (input) => {
            await onAddManualTask(input);
            onNotify('Đã thêm việc cần làm mới.', 'ok');
          }}
        />
      )}
    </div>
  );
}

interface AddTaskSheetProps {
  trees: Tree[];
  hapticsEnabled: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; dueDate: ISODate; targetId?: string }) => Promise<void>;
}

function AddTaskSheet({ trees, hapticsEnabled, onClose, onSubmit }: AddTaskSheetProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<ISODate>(() => todayVN());
  const [targetId, setTargetId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const targetOptions = useMemo(
    () => [
      { value: '', label: 'Toàn vườn (chung)' },
      { value: LOT_A_ID, label: 'Lô A (cây kiến thiết)' },
      ...trees.map((t) => ({
        value: t.id,
        label: t.location ? `${t.code} · ${t.location}` : t.code,
      })),
    ],
    [trees],
  );

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError('Nhập nội dung việc cần làm trước khi lưu.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        title: cleanTitle,
        dueDate: dueDate || todayVN(),
        targetId: targetId || undefined,
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
      title="Thêm việc cần làm"
      subtitle="Tự động lưu trên máy và đồng bộ giữa các thiết bị"
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
            Lưu việc cần làm
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <TextField
          label="Nội dung công việc"
          placeholder="Ví dụ: Kiểm tra béc tưới khu góc cổng"
          value={title}
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError(undefined);
            setDirty(true);
          }}
        />
        <DateField
          label="Ngày cần làm"
          value={dueDate}
          onChange={(next) => {
            setDueDate(next);
            setDirty(true);
          }}
        />
        <SelectField
          label="Gắn với cây hoặc lô (tùy chọn)"
          value={targetId}
          options={targetOptions}
          onChange={(e) => {
            setTargetId(e.target.value);
            setDirty(true);
          }}
        />
      </div>
    </BottomSheet>
  );
}
