import {
  AlertTriangle,
  CheckCircle2,
  Download,
  HardDrive,
  Info,
  Palette,
  Smartphone,
  Vibrate,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { type DatabaseInitResult, requestPersistentStorage } from '../../db/database';
import { formatBytesVN } from '../../lib/format';
import { Banner, Button, Card, ListItem, StatusPill } from '../ui';

interface SettingsScreenProps {
  appVersion: string;
  dbState: DatabaseInitResult | null;
  isStandalone: boolean;
  hapticsEnabled: boolean;
  showDesignEntry: boolean;
  onToggleHaptics: (next: boolean) => void;
  onInstallClick: () => void;
  onOpenDesignShowcase: () => void;
}

export function SettingsScreen({
  appVersion,
  dbState,
  isStandalone,
  hapticsEnabled,
  showDesignEntry,
  onToggleHaptics,
  onInstallClick,
  onOpenDesignShowcase,
}: SettingsScreenProps) {
  const [liveStorage, setLiveStorage] = useState<{
    persisted: boolean;
    usage: number | null;
    quota: number | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void requestPersistentStorage().then((info) => {
      if (active) setLiveStorage(info);
    });
    return () => {
      active = false;
    };
  }, []);

  const persisted = liveStorage?.persisted ?? dbState?.persistentGranted ?? false;
  const usageBytes = liveStorage ? liveStorage.usage : (dbState?.storageUsageBytes ?? null);
  const quotaBytes = liveStorage ? liveStorage.quota : (dbState?.storageQuotaBytes ?? null);
  const usageLabel = formatBytesVN(usageBytes);
  const quotaLabel = formatBytesVN(quotaBytes);

  return (
    <div className="space-y-4">
      {/* Touch & Haptics (D01 AC6) */}
      <section aria-labelledby="sec-feel-heading">
        <h2 id="sec-feel-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Cảm giác thao tác
        </h2>
        <Card padding="none">
          <div className="flex items-center gap-3 px-4 py-3 min-h-17">
            <div
              className="w-11 h-11 rounded-tile bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Vibrate className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div id="haptics-label" className="text-body font-semibold text-text leading-snug">
                Rung nhẹ khi lưu thao tác
              </div>
              <p className="text-caption text-text-3 leading-snug mt-0.5">
                Phản hồi rung ngắn khi lưu nhật ký hoặc đánh dấu xong việc.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              aria-labelledby="haptics-label"
              onClick={() => onToggleHaptics(!hapticsEnabled)}
              className="pressable min-w-14 min-h-12 px-1 flex items-center justify-center rounded-pill shrink-0"
            >
              <span
                className={[
                  'w-13 h-8 rounded-pill p-1 transition-colors flex items-center',
                  hapticsEnabled
                    ? 'bg-primary justify-end'
                    : 'bg-surface-2 border border-outline-strong justify-start',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-6 h-6 rounded-pill shadow-e1 transition-transform',
                    hapticsEnabled ? 'bg-on-primary' : 'bg-text-3',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>
        </Card>
      </section>

      {/* Install Section */}
      <section aria-labelledby="sec-pwa-heading">
        <h2 id="sec-pwa-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Cài ứng dụng ra màn hình chính
        </h2>
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-body font-semibold text-text">
              <Smartphone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              <span>Chế độ mở ứng dụng</span>
            </div>
            {isStandalone ? (
              <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                Đã cài toàn màn hình
              </StatusPill>
            ) : (
              <StatusPill tone="info" icon={<Info className="w-4 h-4" />}>
                Đang mở trên trình duyệt
              </StatusPill>
            )}
          </div>

          {isStandalone ? (
            <p className="text-caption text-text-2">
              Ứng dụng đang chạy toàn màn hình và tự cập nhật khi có bản mới.
            </p>
          ) : (
            <>
              <p className="text-caption text-text-2">
                Cài từ Chrome để mở toàn màn hình, dùng không cần mạng ngoài vườn và tự cập nhật khi
                có bản mới.
              </p>
              <Button
                variant="filled"
                size="lg"
                leadingIcon={<Download className="w-5 h-5" />}
                onClick={onInstallClick}
              >
                Cài app lên điện thoại
              </Button>
            </>
          )}
        </Card>
      </section>

      {/* Device & Storage Info */}
      <section aria-labelledby="sec-storage-heading">
        <h2 id="sec-storage-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Thiết bị &amp; Lưu trữ ngoại tuyến
        </h2>
        <Card padding="none">
          <ListItem
            title="Phiên bản ứng dụng"
            subtitle="Tự cập nhật khi có bản mới"
            trailing={<span className="font-mono text-text">v{appVersion}</span>}
          />
          <ListItem
            divider
            title="Mã máy"
            subtitle={dbState?.settings.deviceId ?? 'Đang tạo…'}
          />
          <ListItem
            divider
            leadingIcon={<HardDrive className="w-5.5 h-5.5" />}
            leadingTone={persisted ? 'ok' : 'warn'}
            title="Bộ nhớ bền vững"
            subtitle={`Đang dùng ${usageLabel}${quotaBytes !== null ? ` / ${quotaLabel}` : ''}`}
            trailing={
              persisted ? (
                <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                  Đã cấp
                </StatusPill>
              ) : (
                <StatusPill tone="warn" icon={<AlertTriangle className="w-4 h-4" />}>
                  Chưa cấp
                </StatusPill>
              )
            }
          />
        </Card>
      </section>

      {/* Mandatory Chrome Warning (SPEC §7.0) */}
      <Banner
        tone="danger"
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Lưu ý giữ an toàn dữ liệu"
      >
        Gỡ app hoặc xóa dữ liệu trang của Chrome sẽ xóa dữ liệu trên máy này. Hãy bật đồng bộ sao
        lưu khi tính năng sẵn sàng để luôn có bản dự phòng.
      </Banner>

      {/* Upcoming sync / AI note (+ #/design link only in dev or ?design=1 mode) */}
      <Card padding="none">
        <ListItem
          leadingIcon={<Info className="w-5.5 h-5.5" />}
          leadingTone="info"
          title="Sao lưu & Trợ lý AI"
          subtitle="Sắp có: đồng bộ sao lưu hai chiều và trợ lý chăm sóc vườn. Các khóa kết nối chỉ lưu trên máy này, không xuất ra ngoài."
        />
        {showDesignEntry && (
          <ListItem
            divider
            leadingIcon={<Palette className="w-5.5 h-5.5" />}
            leadingTone="ph"
            title="Hệ thống thiết kế (#/design)"
            subtitle="Xem toàn bộ component ở các trạng thái"
            showChevron
            onClick={onOpenDesignShowcase}
          />
        )}
      </Card>
    </div>
  );
}
