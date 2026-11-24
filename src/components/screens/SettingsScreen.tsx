import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  HardDrive,
  Info,
  Palette,
  Smartphone,
  Upload,
  Vibrate,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type DatabaseInitResult, requestPersistentStorage } from '../../db/database';
import { nowUTC, todayVN } from '../../lib/date';
import {
  exportFileName,
  importToSyncState,
  parseImportFile,
} from '../../lib/exportImport';
import { formatBytesVN } from '../../lib/format';
import {
  diffCounts,
  type MergeCounts,
  type SyncCollection,
  type SyncState,
} from '../../lib/merge';
import { Banner, Button, Card, Dialog, ListItem, StatusPill } from '../ui';

interface SettingsScreenProps {
  appVersion: string;
  dbState: DatabaseInitResult | null;
  deviceId: string;
  isStandalone: boolean;
  hapticsEnabled: boolean;
  showDesignEntry: boolean;
  onToggleHaptics: (next: boolean) => void;
  onInstallClick: () => void;
  onOpenDesignShowcase: () => void;
  onExportJson: (includePhotos: boolean) => Promise<string>;
  onGetLocalSnapshot: () => Promise<SyncState>;
  onApplyImport: (incoming: SyncState, photoData?: Record<string, string>) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

export function SettingsScreen({
  appVersion,
  dbState,
  deviceId,
  isStandalone,
  hapticsEnabled,
  showDesignEntry,
  onToggleHaptics,
  onInstallClick,
  onOpenDesignShowcase,
  onExportJson,
  onGetLocalSnapshot,
  onApplyImport,
  onNotify,
}: SettingsScreenProps) {
  const [liveStorage, setLiveStorage] = useState<{
    persisted: boolean;
    usage: number | null;
    quota: number | null;
  } | null>(null);

  const [includePhotosInExport, setIncludePhotosInExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    incoming: SyncState;
    photoData?: Record<string, string>;
    counts: Record<SyncCollection, MergeCounts>;
    isLegacy: boolean;
    photoBlobsCount: number;
    fileName: string;
  } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const jsonText = await onExportJson(includePhotosInExport);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(todayVN());
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify(
        includePhotosInExport
          ? 'Đã xuất tệp sao lưu JSON kèm ảnh cây (không chứa khóa bảo mật).'
          : 'Đã xuất tệp sao lưu JSON (không chứa khóa bảo mật).',
        'ok',
      );
    } catch {
      onNotify('Không thể xuất tệp sao lưu lúc này.', 'danger');
    } finally {
      setExporting(false);
    }
  };

  const handleSelectImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsedRes = parseImportFile(text);
      if (!parsedRes.ok) {
        onNotify(parsedRes.error, 'danger');
        return;
      }
      const localSnapshot = await onGetLocalSnapshot();
      const incoming = importToSyncState(parsedRes, {
        deviceId,
        now: nowUTC(),
        existingTrees: localSnapshot.trees,
      });
      const counts = diffCounts(localSnapshot, incoming);
      const photoData = parsedRes.kind === 'ri6' ? parsedRes.photoData : undefined;
      setPendingImport({
        incoming,
        photoData,
        counts,
        isLegacy: parsedRes.kind === 'legacy',
        photoBlobsCount: photoData ? Object.keys(photoData).length : 0,
        fileName: file.name,
      });
    } catch {
      onNotify('Không đọc được tệp JSON vừa chọn.', 'danger');
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await onApplyImport(pendingImport.incoming, pendingImport.photoData);
      setPendingImport(null);
      onNotify('Đã gộp dữ liệu sao lưu vào máy thành công.', 'ok');
    } catch {
      onNotify('Lỗi khi gộp dữ liệu sao lưu.', 'danger');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Backup & Restore JSON (T02 AC7 & AC8) */}
      <section aria-labelledby="sec-backup-heading">
        <h2 id="sec-backup-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Sao lưu &amp; Khôi phục dữ liệu
        </h2>
        <Card padding="none">
          <div className="flex items-center gap-3 px-4 py-3 min-h-17">
            <div
              className="w-11 h-11 rounded-tile bg-info-container text-info flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <FileJson className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div id="export-photos-label" className="text-body font-semibold text-text leading-snug">
                Kèm ảnh cây khi xuất tệp
              </div>
              <p className="text-caption text-text-3 leading-snug mt-0.5">
                Tệp xuất không bao giờ chứa khóa kết nối hay mật khẩu.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includePhotosInExport}
              aria-labelledby="export-photos-label"
              onClick={() => setIncludePhotosInExport((v) => !v)}
              className="pressable min-w-14 min-h-12 px-1 flex items-center justify-center rounded-pill shrink-0"
            >
              <span
                className={[
                  'w-13 h-8 rounded-pill p-1 transition-colors flex items-center',
                  includePhotosInExport
                    ? 'bg-primary justify-end'
                    : 'bg-surface-2 border border-outline-strong justify-start',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-6 h-6 rounded-pill shadow-e1 transition-transform',
                    includePhotosInExport ? 'bg-on-primary' : 'bg-text-3',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>

          <div className="px-4 pb-4 pt-2 border-t border-surface-2 flex flex-wrap gap-2.5">
            <Button
              variant="filled"
              size="lg"
              loading={exporting}
              leadingIcon={<Download className="w-5 h-5" />}
              onClick={() => {
                void handleExport();
              }}
            >
              Xuất JSON
            </Button>
            <Button
              variant="tonal"
              size="lg"
              leadingIcon={<Upload className="w-5 h-5" />}
              onClick={() => {
                if (importFileRef.current) {
                  importFileRef.current.value = '';
                  importFileRef.current.click();
                }
              }}
            >
              Nhập JSON / bản cũ
            </Button>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Chọn tệp sao lưu JSON để nhập"
              onChange={(e) => {
                void handleSelectImportFile(e.target.files?.[0]);
              }}
            />
          </div>
        </Card>
      </section>

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
          <ListItem divider title="Mã máy" subtitle={deviceId} />
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
        Gỡ app hoặc xóa dữ liệu trang của Chrome sẽ xóa dữ liệu trên máy này. Hãy xuất sao lưu định
        kỳ hoặc bật đồng bộ khi sẵn sàng để luôn có bản dự phòng.
      </Banner>

      <Card padding="none">
        <ListItem
          leadingIcon={<Info className="w-5.5 h-5.5" />}
          leadingTone="info"
          title="Đồng bộ tự động & Trợ lý AI"
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

      {/* Import Merge Preview Dialog (T02 AC7 & AC8) */}
      <Dialog
        open={Boolean(pendingImport)}
        title="Xem trước khi nhập dữ liệu"
        subtitle={
          pendingImport
            ? `Tệp: ${pendingImport.fileName}${pendingImport.isLegacy ? ' (nhận diện tệp sao lưu bản cũ)' : ''}`
            : undefined
        }
        onClose={() => setPendingImport(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setPendingImport(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              size="lg"
              loading={importing}
              onClick={() => {
                void handleConfirmImport();
              }}
            >
              Áp dụng gộp dữ liệu
            </Button>
          </>
        }
      >
        {pendingImport && (
          <div className="space-y-3">
            <Banner tone="info" icon={<Info className="w-5 h-5" />}>
              Dữ liệu sẽ được <strong>gộp thông minh theo thời gian cập nhật mới nhất</strong>,
              không ghi đè mất các ghi chép mới hơn đang có trên máy.
            </Banner>

            <Card padding="none" elevated={false}>
              <ListItem
                title="Hồ sơ cây cá thể"
                trailing={`+${pendingImport.counts.trees.added} mới · ${pendingImport.counts.trees.updated} cập nhật`}
              />
              <ListItem
                divider
                title="Nhật ký chăm sóc"
                trailing={`+${pendingImport.counts.logs.added} mới · ${pendingImport.counts.logs.updated} cập nhật`}
              />
              {pendingImport.counts.lots.added + pendingImport.counts.lots.updated > 0 && (
                <ListItem
                  divider
                  title="Thông tin Lô A"
                  trailing={`${pendingImport.counts.lots.added + pendingImport.counts.lots.updated} cập nhật`}
                />
              )}
              {(pendingImport.counts.photos.added > 0 || pendingImport.photoBlobsCount > 0) && (
                <ListItem
                  divider
                  title="Ảnh cây"
                  trailing={`+${pendingImport.counts.photos.added} mục (${pendingImport.photoBlobsCount} ảnh kèm)`}
                />
              )}
            </Card>
          </div>
        )}
      </Dialog>
    </div>
  );
}
