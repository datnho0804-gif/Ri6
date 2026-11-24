import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  HardDrive,
  Info,
  Smartphone,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { type DatabaseInitResult, requestPersistentStorage } from '../../db/database';

interface SettingsScreenProps {
  appVersion: string;
  dbState: DatabaseInitResult | null;
  isStandalone: boolean;
  onInstallClick: () => void;
  onBack: () => void;
}

const vnNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

function formatStorageBytesVN(bytes: number | null): string {
  if (bytes === null) return 'Không đo được';
  if (bytes < 1024) return `${vnNumber.format(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${vnNumber.format(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${vnNumber.format(mb)} MB`;
  const gb = mb / 1024;
  return `${vnNumber.format(gb)} GB`;
}

export function SettingsScreen({
  appVersion,
  dbState,
  isStandalone,
  onInstallClick,
  onBack,
}: SettingsScreenProps) {
  const [liveStorage, setLiveStorage] = useState<{
    persisted: boolean;
    usage: number | null;
    quota: number | null;
  } | null>(null);

  // Re-measure storage estimate every time Settings opens (so SW precache & new data are reflected)
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

  const usageLabel = formatStorageBytesVN(usageBytes);
  const quotaLabel = formatStorageBytesVN(quotaBytes);

  return (
    <div className="space-y-5">
      {/* Back Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] px-4 rounded-xl bg-white border border-sand-300 hover:bg-sand-100 text-ink text-base font-bold inline-flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Quay lại
        </button>
        <span className="font-mono text-sm font-bold text-durian-900 bg-durian-100 px-3 py-1.5 rounded-xl">
          v{appVersion}
        </span>
      </div>

      {/* Main Settings Scaffold */}
      <section className="bg-white rounded-2xl border border-sand-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Cài đặt ứng dụng</h2>
          <p className="text-base text-ink-muted mt-1">
            Khung màn Cài đặt (các mục đồng bộ GitHub, Gemini AI và xuất/nhập JSON sẽ được kích hoạt từ T02 và T04).
          </p>
        </div>

        {/* Device & Version Info */}
        <div className="rounded-xl bg-sand border border-sand-200 p-4 space-y-2 text-base">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink-muted">Phiên bản ứng dụng</span>
            <span className="font-mono font-bold text-ink">v{appVersion}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sand-200">
            <span className="font-semibold text-ink-muted">Mã thiết bị (deviceId)</span>
            <span className="font-mono text-sm font-semibold text-ink break-all">
              {dbState?.settings.deviceId ?? 'Đang tạo…'}
            </span>
          </div>
        </div>

        {/* PWA Install Section */}
        <div className="rounded-xl bg-durian-50 border border-durian-200 p-4 space-y-3">
          <h3 className="text-base font-bold text-durian-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 shrink-0" aria-hidden="true" />
            Cài ứng dụng ra màn hình chính
          </h3>
          {isStandalone ? (
            <p className="text-base text-durian-900 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-status-ok shrink-0" aria-hidden="true" />
              Ứng dụng đang chạy ở chế độ đã cài trên màn hình chính.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-base text-ink">
                Cài từ Chrome để mở toàn màn hình, chạy offline ngoài vườn và tự cập nhật khi có phiên bản mới.
              </p>
              <button
                type="button"
                onClick={onInstallClick}
                className="min-h-[48px] px-5 rounded-xl bg-durian-900 hover:bg-durian-950 text-white text-base font-bold inline-flex items-center gap-2 transition"
              >
                <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
                Cài app lên điện thoại
              </button>
            </div>
          )}
        </div>

        {/* Persistent Storage Status (SPEC §7.0) */}
        <div className="rounded-xl bg-white border border-sand-200 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-durian-900 shrink-0" aria-hidden="true" />
              Bộ nhớ bền vững
            </h3>
            {persisted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-ok-bg text-status-ok text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Đã cấp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-warn-bg text-status-warn text-sm font-bold">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                Chưa cấp
              </span>
            )}
          </div>
          <p className="text-base text-ink-muted tabular-nums">
            Dung lượng đang dùng: <strong className="text-ink">{usageLabel}</strong>
            {quotaBytes !== null ? ` / ${quotaLabel}` : ''}
          </p>
          {!persisted && (
            <p className="text-sm text-status-warn font-medium">
              Khuyến nghị: hãy cài app ra màn hình chính và bật đồng bộ GitHub (T04) để trình duyệt ưu tiên giữ dữ liệu lâu dài.
            </p>
          )}
        </div>

        {/* Mandatory Chrome Warning (SPEC §7.0) */}
        <div className="rounded-xl bg-status-danger-bg border border-red-300 p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-status-danger shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-base text-ink font-medium leading-relaxed">
            Gỡ app hoặc xóa dữ liệu trang của Chrome sẽ xóa dữ liệu trên máy này. Hãy bật đồng bộ
            GitHub để luôn có bản sao.
          </p>
        </div>

        {/* Upcoming T04 Placeholder */}
        <div className="rounded-xl bg-sand border border-dashed border-sand-300 p-4 flex items-start gap-3 text-ink-muted">
          <Info className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-base">
            Cấu hình đồng bộ repo riêng tư <code className="font-mono text-ink">Ri6-data</code>, khóa
            Gemini cục bộ và sao lưu JSON sẽ hiển thị tại đây trong T02 và T04.
          </p>
        </div>
      </section>
    </div>
  );
}
