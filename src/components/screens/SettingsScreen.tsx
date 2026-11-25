import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileJson,
  HardDrive,
  Info,
  KeyRound,
  Palette,
  RefreshCw,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Upload,
  Vibrate,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type DatabaseInitResult, requestPersistentStorage } from '../../db/database';
import { isValidGitHubRepo } from '../../db/syncStore';
import { createRetryingGeminiFetch, formatGeminiErrorMessage } from '../../hooks/geminiRetry';
import type { RepoTestOutcome, SyncHeaderStatus } from '../../hooks/useGitHubSync';
import {
  disableAgendaReminders,
  enableAgendaReminders,
  notifyCapability,
  type NotifyCapability,
} from '../../lib/agenda/register';
import { createGeminiClient } from '../../lib/ai/gemini';
import type { MemoryProposal } from '../../lib/ai/memory';
import { type GeminiModelInfo, modelLabel, pickDefaultModel } from '../../lib/ai/models';
import { nowUTC, todayVN } from '../../lib/date';
import {
  exportFileName,
  importToSyncState,
  parseImportFile,
} from '../../lib/exportImport';
import { formatBytesVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import {
  diffCounts,
  type MergeCounts,
  type SyncCollection,
  type SyncState,
} from '../../lib/merge';
import type { SyncResult } from '../../lib/sync/engine';
import { type GitHubConfig, REPO_SIZE_WARN_KB } from '../../lib/sync/github';
import type { AiMemory, Log, Settings, Tree } from '../../types/models';
import {
  Banner,
  Button,
  Card,
  Dialog,
  IconButton,
  ListItem,
  SelectField,
  StatusPill,
  TextField,
} from '../ui';
import { AiMemoryManager } from './AiMemoryManager';

interface SettingsScreenProps {
  appVersion: string;
  dbState: DatabaseInitResult | null;
  settings: Settings | null;
  deviceId: string;
  isStandalone: boolean;
  isOnline: boolean;
  hapticsEnabled: boolean;
  showDesignEntry: boolean;
  syncStatus: SyncHeaderStatus;
  isSyncing: boolean;
  isSyncConfigured: boolean;
  pendingSyncCount: number;
  lastSyncError: string | null;
  aiMemories: AiMemory[];
  trees: Tree[];
  logs: Log[];
  onUpdateSettings: (patch: Partial<Settings>) => Promise<void>;
  onTestConnection: (cfg: GitHubConfig) => Promise<RepoTestOutcome>;
  onSyncNow: () => Promise<SyncResult | null>;
  onToggleHaptics: (next: boolean) => void;
  onInstallClick: () => void;
  onOpenDesignShowcase: () => void;
  onExportJson: (includePhotos: boolean) => Promise<string>;
  onGetLocalSnapshot: () => Promise<SyncState>;
  onApplyImport: (incoming: SyncState, photoData?: Record<string, string>) => Promise<void>;
  onAddAiMemory: (
    proposal: MemoryProposal & { source: 'manual'; approved: true },
  ) => Promise<AiMemory>;
  onEditAiMemory: (
    memory: AiMemory,
    patch: Partial<Pick<AiMemory, 'content' | 'category' | 'targetIds'>>,
  ) => Promise<AiMemory>;
  onDeleteAiMemory: (memory: AiMemory) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

function formatSizeMb(sizeKB: number): string {
  if (sizeKB < 1024) return `${sizeKB} KB`;
  return `${(sizeKB / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function SettingsScreen({
  appVersion,
  dbState,
  settings,
  deviceId,
  isStandalone,
  isOnline,
  hapticsEnabled,
  showDesignEntry,
  syncStatus,
  isSyncing,
  isSyncConfigured,
  pendingSyncCount,
  lastSyncError,
  aiMemories,
  trees,
  logs,
  onUpdateSettings,
  onTestConnection,
  onSyncNow,
  onToggleHaptics,
  onInstallClick,
  onOpenDesignShowcase,
  onExportJson,
  onGetLocalSnapshot,
  onApplyImport,
  onAddAiMemory,
  onEditAiMemory,
  onDeleteAiMemory,
  onNotify,
}: SettingsScreenProps) {
  const [liveStorage, setLiveStorage] = useState<{
    persisted: boolean;
    usage: number | null;
    quota: number | null;
  } | null>(null);
  const [notifyCap, setNotifyCap] = useState<NotifyCapability | null>(null);
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const [sendingTestNotify, setSendingTestNotify] = useState(false);

  // Device & GitHub sync form draft overrides (persisted in Dexie `settings`, never localStorage)
  const [draftDeviceName, setDeviceName] = useState<string | null>(null);
  const [draftDataRepo, setDataRepo] = useState<string | null>(null);
  const [draftDataBranch, setDataBranch] = useState<string | null>(null);
  const [draftGithubToken, setGithubToken] = useState<string | null>(null);
  const [draftAutoSync, setAutoSync] = useState<boolean | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [repoError, setRepoError] = useState<string | undefined>();
  const [savingSync, setSavingSync] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testOutcome, setTestOutcome] = useState<RepoTestOutcome | null>(null);

  const deviceName = draftDeviceName ?? settings?.deviceName ?? 'Điện thoại của tôi';
  const dataRepo = draftDataRepo ?? settings?.dataRepo ?? 'datnho0804-gif/Ri6-data';
  const dataBranch = draftDataBranch ?? settings?.dataBranch ?? 'main';
  const githubToken = draftGithubToken ?? settings?.githubToken ?? '';
  const autoSync = draftAutoSync ?? settings?.autoSync ?? true;

  // Gemini AI local-only settings draft overrides (T06 AC1 — zero hard-coded model names)
  const [draftGeminiKey, setDraftGeminiKey] = useState<string | null>(null);
  const [draftGeminiModel, setDraftGeminiModel] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiModels, setGeminiModels] = useState<GeminiModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [geminiCheck, setGeminiCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const geminiApiKey = draftGeminiKey ?? settings?.geminiApiKey ?? '';
  const geminiModel = draftGeminiModel ?? settings?.geminiModel ?? '';

  // JSON Export / Import state
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
    void notifyCapability().then((cap) => {
      if (active) setNotifyCap(cap);
    });
    return () => {
      active = false;
    };
  }, []);

  const formatDateTimeVN = (iso: string | undefined): string => {
    if (!iso) return 'Chưa gửi lần nào';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleEnableNotify = async () => {
    setUpdatingNotify(true);
    try {
      const res = await enableAgendaReminders();
      setNotifyCap(await notifyCapability());
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
            ? 'Đã bật nhắc nhở hằng ngày (periodicsync ri6-agenda).'
            : 'Đã cấp quyền thông báo. Với mốc quan trọng hãy dùng thêm Google Calendar.',
          'ok',
        );
      } else if (res.permission === 'denied') {
        onNotify('Quyền thông báo đang bị chặn. Hãy mở lại trong Cài đặt trang của Chrome.', 'warn');
      } else {
        onNotify('Trình duyệt không hỗ trợ thông báo — hãy dùng Google Calendar trong Việc cần làm.', 'info');
      }
    } finally {
      setUpdatingNotify(false);
    }
  };

  const handleDisableNotify = async () => {
    setUpdatingNotify(true);
    try {
      await disableAgendaReminders();
      await onUpdateSettings({
        notify: {
          enabled: false,
          lastNotifiedAt: settings?.notify?.lastNotifiedAt,
          lastKeys: settings?.notify?.lastKeys ?? [],
        },
      });
      setNotifyCap(await notifyCapability());
      onNotify('Đã tắt nhắc việc định kỳ.', 'info');
    } finally {
      setUpdatingNotify(false);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTestNotify(true);
    try {
      let cap = await notifyCapability();
      setNotifyCap(cap);
      if (!cap.notificationSupported) {
        onNotify('Trình duyệt này không hỗ trợ gửi thông báo.', 'warn');
        return;
      }
      if (cap.permission !== 'granted') {
        const res = await enableAgendaReminders();
        cap = await notifyCapability();
        setNotifyCap(cap);
        if (res.permission !== 'granted') {
          onNotify('Cần cấp quyền thông báo trước khi gửi thông báo thử.', 'warn');
          return;
        }
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const worker = reg.active ?? navigator.serviceWorker.controller;
        if (worker) {
          worker.postMessage({ type: 'ri6-test-notification' });
          triggerHaptic(hapticsEnabled);
          onNotify('Đã gửi yêu cầu thông báo thử từ Service Worker!', 'ok');
          return;
        }
      }
      // Fallback when running without active SW (e.g. dev mode)
      new Notification('Vườn Ri6 · Thông báo thử', {
        body: 'Nhắc việc đang hoạt động trên thiết bị này.',
      });
      onNotify('Đã gửi thông báo thử trực tiếp.', 'ok');
    } catch {
      onNotify('Không gửi được thông báo thử lúc này.', 'danger');
    } finally {
      setSendingTestNotify(false);
    }
  };

  const handleTestAndLoadGeminiModels = async () => {
    const cleanKey = geminiApiKey.trim();
    if (!cleanKey) {
      setGeminiCheck({ ok: false, message: 'Hãy nhập Gemini API key trước khi kiểm tra.' });
      return;
    }
    setLoadingModels(true);
    setGeminiCheck(null);
    try {
      const client = createGeminiClient(cleanKey, createRetryingGeminiFetch());
      const list = await client.listChatModels();
      setGeminiModels(list);
      if (list.length === 0) {
        setGeminiCheck({
          ok: false,
          message: 'API key hợp lệ nhưng không tìm thấy model Gemini hỗ trợ hỏi đáp.',
        });
        return;
      }
      const hasCurrent = list.some((m) => m.name === geminiModel);
      const recommended = hasCurrent ? geminiModel : (pickDefaultModel(list) ?? list[0].name);
      if (!hasCurrent) {
        setDraftGeminiModel(recommended);
      }
      setGeminiCheck({
        ok: true,
        message: `Kết nối thành công! Tìm thấy ${list.length} model phù hợp · Đang chọn: ${modelLabel(recommended)}.`,
      });
      triggerHaptic(hapticsEnabled);
      onNotify(`Đã tải ${list.length} model Gemini từ API.`, 'ok');
    } catch (err) {
      const msg = formatGeminiErrorMessage(err);
      setGeminiCheck({ ok: false, message: msg });
      onNotify(msg, 'danger');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveGeminiSettings = async () => {
    const cleanKey = geminiApiKey.trim();
    const cleanModel = geminiModel.trim();
    setSavingGemini(true);
    try {
      await onUpdateSettings({
        geminiApiKey: cleanKey || undefined,
        geminiModel: cleanModel || undefined,
      });
      setDraftGeminiKey(null);
      setDraftGeminiModel(null);
      triggerHaptic(hapticsEnabled);
      onNotify(
        cleanKey
          ? 'Đã lưu cài đặt Trợ lý AI Gemini trên máy này.'
          : 'Đã xóa Gemini API key (chuyển về chế độ Copy Prompt).',
        'ok',
      );
    } catch {
      onNotify('Không lưu được cài đặt Gemini vào bộ nhớ máy.', 'danger');
    } finally {
      setSavingGemini(false);
    }
  };

  const persisted = liveStorage?.persisted ?? dbState?.persistentGranted ?? false;
  const usageBytes = liveStorage ? liveStorage.usage : (dbState?.storageUsageBytes ?? null);
  const quotaBytes = liveStorage ? liveStorage.quota : (dbState?.storageQuotaBytes ?? null);
  const usageLabel = formatBytesVN(usageBytes);
  const quotaLabel = formatBytesVN(quotaBytes);

  const REPO_FORMAT_ERROR =
    'Nhập đúng dạng chủ-tài-khoản/tên-repo (ví dụ: datnho0804-gif/Ri6-data), không dán cả đường dẫn https://github.com/.';

  const persistFormSettings = async (opts?: { silent?: boolean }): Promise<boolean> => {
    const cleanName = deviceName.trim() || 'Điện thoại của tôi';
    const cleanRepo = dataRepo.trim() || 'datnho0804-gif/Ri6-data';
    const cleanBranch = dataBranch.trim() || 'main';
    const cleanToken = githubToken.trim();

    if (!isValidGitHubRepo(cleanRepo)) {
      setRepoError(REPO_FORMAT_ERROR);
      if (!opts?.silent) {
        onNotify('Tên repo chưa đúng dạng chủ-tài-khoản/tên-repo.', 'danger');
      }
      return false;
    }
    setRepoError(undefined);

    const repoChanged = cleanRepo !== (settings?.dataRepo ?? '');
    setSavingSync(true);
    try {
      await onUpdateSettings({
        deviceName: cleanName,
        dataRepo: cleanRepo,
        dataBranch: cleanBranch,
        githubToken: cleanToken || undefined,
        autoSync,
        ...(repoChanged ? { lastRepoSizeKB: undefined, lastRepoCheckedAt: undefined } : {}),
      });
      setDeviceName(null);
      setDataRepo(null);
      setDataBranch(null);
      setGithubToken(null);
      setAutoSync(null);
      if (!opts?.silent) {
        triggerHaptic(hapticsEnabled);
        onNotify(
          cleanToken
            ? 'Đã lưu cài đặt thiết bị và đồng bộ GitHub trên máy này.'
            : 'Đã lưu tên thiết bị. Nhập token GitHub để bật đồng bộ nhiều máy.',
          'ok',
        );
      }
      return true;
    } catch {
      onNotify('Không lưu được cài đặt vào bộ nhớ máy.', 'danger');
      return false;
    } finally {
      setSavingSync(false);
    }
  };

  const handleSaveDeviceAndSync = async () => {
    await persistFormSettings();
  };

  const handleToggleAutoSync = async (next: boolean) => {
    setAutoSync(next);
    try {
      await onUpdateSettings({ autoSync: next });
      setAutoSync(null);
      triggerHaptic(hapticsEnabled);
      onNotify(
        next
          ? 'Đã bật tự động đồng bộ và đồng bộ nền.'
          : 'Đã tắt tự động đồng bộ — bạn vẫn có thể bấm Đồng bộ ngay bất cứ lúc nào.',
        'info',
      );
    } catch {
      setAutoSync(null);
      onNotify('Không lưu được tùy chọn tự động đồng bộ.', 'danger');
    }
  };

  const handleTestConnection = async () => {
    const cleanToken = githubToken.trim();
    const cleanRepo = dataRepo.trim();
    const cleanBranch = dataBranch.trim() || 'main';
    if (!cleanToken) {
      setTestOutcome({
        ok: false,
        error: 'Chưa nhập GitHub token để kiểm tra kết nối.',
        errorKind: 'config',
      });
      return;
    }
    if (!cleanRepo || !isValidGitHubRepo(cleanRepo)) {
      setRepoError(REPO_FORMAT_ERROR);
      setTestOutcome({
        ok: false,
        error: REPO_FORMAT_ERROR,
        errorKind: 'config',
      });
      return;
    }
    setRepoError(undefined);
    setTestingConn(true);
    setTestOutcome(null);
    try {
      const outcome = await onTestConnection({
        token: cleanToken,
        repo: cleanRepo,
        branch: cleanBranch,
      });
      setTestOutcome(outcome);
      if (outcome.ok && outcome.repoCheck) {
        try {
          await onUpdateSettings({
            lastRepoSizeKB: outcome.repoCheck.sizeKB,
            lastRepoCheckedAt: nowUTC(),
          });
        } catch {
          // Best-effort persistence of repo size metadata
        }
      }
      if (!outcome.ok) {
        onNotify(outcome.error ?? 'Không kiểm tra được kết nối GitHub.', 'danger');
      } else if (outcome.repoCheck && !outcome.repoCheck.private && !outcome.repoCheck.canPush) {
        onNotify(
          'Cảnh báo đỏ: Repo đang CÔNG KHAI (Public) VÀ token thiếu quyền ghi (Push)!',
          'danger',
        );
      } else if (outcome.repoCheck && !outcome.repoCheck.canPush) {
        onNotify('Token thiếu quyền ghi (Contents: Read and write).', 'danger');
      } else if (outcome.repoCheck && !outcome.repoCheck.private) {
        onNotify('Cảnh báo đỏ: Repo dữ liệu đang ở chế độ công khai!', 'danger');
      } else {
        triggerHaptic(hapticsEnabled);
        onNotify('Kết nối GitHub hợp lệ: repo riêng tư và có quyền ghi.', 'ok');
      }
    } finally {
      setTestingConn(false);
    }
  };

  const handleManualSync = async () => {
    if (!isSyncConfigured && !githubToken.trim()) {
      onNotify('Hãy nhập token GitHub trước khi đồng bộ.', 'warn');
      return;
    }
    if (hasUnsavedSyncEdits) {
      const saved = await persistFormSettings({ silent: true });
      if (!saved) return;
    }
    if (!isOnline) {
      onNotify('Thiết bị đang ngoại tuyến. Sẽ tự đồng bộ khi có mạng trở lại.', 'warn');
      return;
    }
    const res = await onSyncNow();
    if (!res) return;
    if (res.status === 'ok') {
      triggerHaptic(hapticsEnabled);
      const summaryParts: string[] = [];
      if (res.pushedChanges > 0) summaryParts.push(`đẩy ${res.pushedChanges} thay đổi`);
      if (res.pulled > 0) summaryParts.push(`nhận ${res.pulled} cập nhật`);
      if (res.uploadedPhotos > 0) summaryParts.push(`tải lên ${res.uploadedPhotos} ảnh`);
      onNotify(
        summaryParts.length > 0
          ? `Đã đồng bộ xong: ${summaryParts.join(', ')}.`
          : 'Dữ liệu đã khớp mới nhất với GitHub.',
        'ok',
      );
    } else {
      onNotify(res.message, 'danger');
    }
  };

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

  const hasUnsavedSyncEdits =
    deviceName.trim() !== (settings?.deviceName ?? 'Điện thoại của tôi') ||
    dataRepo.trim() !== (settings?.dataRepo ?? 'datnho0804-gif/Ri6-data') ||
    dataBranch.trim() !== (settings?.dataBranch ?? 'main') ||
    githubToken.trim() !== (settings?.githubToken ?? '');

  const persistedRepoSizeKB = testOutcome?.ok
    ? testOutcome.repoCheck?.sizeKB
    : settings?.lastRepoSizeKB;

  return (
    <div className="space-y-4">
      {/* Device & GitHub Two-Way Sync (T04 AC1, AC2, AC8, AC9) */}
      <section aria-labelledby="sec-sync-heading">
        <div className="flex items-center justify-between gap-2 px-0.5 mb-2 flex-wrap">
          <h2 id="sec-sync-heading" className="text-title font-bold text-text">
            Thiết bị &amp; Đồng bộ GitHub
          </h2>
          <StatusPill
            tone={syncStatus.tone}
            icon={
              syncStatus.spinning ? (
                <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              ) : syncStatus.tone === 'danger' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Cloud className="w-4 h-4" />
              )
            }
          >
            {syncStatus.shortText || 'Chưa cấu hình'}
          </StatusPill>
        </div>

        <Card padding="md" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Tên thiết bị"
              placeholder="Ví dụ: Điện thoại vườn 1"
              value={deviceName}
              helperText="Hiện trong lịch sử commit đồng bộ để phân biệt từng điện thoại."
              onChange={(e) => setDeviceName(e.target.value)}
            />
            <TextField
              label="Mã máy (deviceId)"
              value={deviceId}
              disabled
              helperText="Tự tạo duy nhất trên máy này, chỉ đọc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              label="Repo dữ liệu riêng tư"
              placeholder="Ví dụ: ten-ban/Ri6-data"
              value={dataRepo}
              error={repoError}
              containerClassName="sm:col-span-2"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setDataRepo(e.target.value);
                setRepoError(undefined);
                setTestOutcome(null);
              }}
            />
            <TextField
              label="Nhánh"
              placeholder="main"
              value={dataBranch}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setDataBranch(e.target.value);
                setTestOutcome(null);
              }}
            />
          </div>

          {/* Token input + Hide/Show toggle + Mandatory *.github.io warning right next to token (AC1, AC9) */}
          <div className="space-y-2.5">
            <TextField
              label="GitHub Fine-grained Token (PAT)"
              type={showToken ? 'text' : 'password'}
              placeholder="github_pat_..."
              value={githubToken}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              helperText="Chỉ lưu trong bộ nhớ ngoại tuyến trên máy này — không bao giờ xuất vào tệp JSON hay đẩy lên GitHub."
              onChange={(e) => {
                setGithubToken(e.target.value);
                setTestOutcome(null);
              }}
              suffix={
                <IconButton
                  label={showToken ? 'Ẩn token GitHub' : 'Hiện token GitHub'}
                  onClick={() => setShowToken((v) => !v)}
                  className="-mr-2"
                >
                  {showToken ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </IconButton>
              }
            />

            <Banner
              tone="warn"
              icon={<KeyRound className="w-5 h-5" />}
              title="Lưu ý tên miền dùng chung *.github.io"
            >
              Mọi trang GitHub Pages của cùng tài khoản đều dùng chung miền{' '}
              <span className="font-mono font-semibold">*.github.io</span> và dùng chung bộ nhớ
              trình duyệt trên máy (gồm cả token này). Không bật GitHub Pages cho repo chứa mã không
              tin cậy, và chỉ cấp token quyền ghi riêng cho repo riêng tư{' '}
              <span className="font-mono font-semibold">Ri6-data</span>.
            </Banner>
          </div>

          {/* Auto-sync switch */}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-2 min-h-14">
            <div
              className="w-11 h-11 rounded-tile bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Cloud className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div id="auto-sync-label" className="text-body font-semibold text-text leading-snug">
                Tự động đồng bộ &amp; đồng bộ nền
              </div>
              <p className="text-caption text-text-3 leading-snug mt-0.5">
                Tự đồng bộ khi mở app, quay lại màn hình, sau 30 giây kể từ thay đổi cuối và đẩy ngầm
                khi có sóng trở lại.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSync}
              aria-labelledby="auto-sync-label"
              onClick={() => {
                void handleToggleAutoSync(!autoSync);
              }}
              className="pressable min-w-14 min-h-12 px-1 flex items-center justify-center rounded-pill shrink-0"
            >
              <span
                className={[
                  'w-13 h-8 rounded-pill p-1 transition-colors flex items-center',
                  autoSync
                    ? 'bg-primary justify-end'
                    : 'bg-surface-2 border border-outline-strong justify-start',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-6 h-6 rounded-pill shadow-e1 transition-transform',
                    autoSync ? 'bg-on-primary' : 'bg-text-3',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>

          {/* Connection Check Result Banners (AC1: error on no push, RED warning if public!) */}
          {testOutcome && !testOutcome.ok && (
            <Banner
              tone="danger"
              icon={<ShieldAlert className="w-5 h-5" />}
              title="Kiểm tra kết nối thất bại"
            >
              {testOutcome.error}
            </Banner>
          )}

          {testOutcome?.ok && testOutcome.repoCheck && (
            <div className="space-y-2">
              {!testOutcome.repoCheck.private && (
                <Banner
                  tone="danger"
                  icon={<ShieldAlert className="w-5 h-5" />}
                  title="CẢNH BÁO ĐỎ: Repo dữ liệu đang CÔNG KHAI (Public)!"
                >
                  Repo <span className="font-mono font-semibold">{dataRepo.trim()}</span> hiện không
                  phải là repo riêng tư. Người lạ có thể xem toàn bộ nhật ký và ảnh vườn. Hãy vào
                  GitHub → Settings → Danger Zone chuyển sang <strong>Private</strong> ngay lập tức.
                </Banner>
              )}

              {!testOutcome.repoCheck.canPush && (
                <Banner
                  tone="danger"
                  icon={<AlertTriangle className="w-5 h-5" />}
                  title="Thiếu quyền ghi (Push) vào repo"
                >
                  Token hiện tại không có quyền ghi vào repo này. Hãy cấp quyền{' '}
                  <strong>Contents: Read and write</strong> cho fine-grained PAT rồi thử lại.
                </Banner>
              )}

              {testOutcome.repoCheck.private && testOutcome.repoCheck.canPush && (
                <Banner
                  tone="ok"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  title="Kết nối hợp lệ — sẵn sàng đồng bộ"
                >
                  Repo riêng tư (Private), đủ quyền đọc/ghi. Nhánh mặc định:{' '}
                  <span className="font-mono">{testOutcome.repoCheck.defaultBranch}</span> · Dung
                  lượng hiện tại: {formatSizeMb(testOutcome.repoCheck.sizeKB)}.
                </Banner>
              )}
            </div>
          )}

          {persistedRepoSizeKB !== undefined && persistedRepoSizeKB > REPO_SIZE_WARN_KB && (
            <Banner
              tone="warn"
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Repo dữ liệu sắp chạm ngưỡng dung lượng"
            >
              Dung lượng hiện tại khoảng {formatSizeMb(persistedRepoSizeKB)} (khuyến nghị giữ dưới
              800 MB). Bạn nên xuất sao lưu JSON định kỳ hoặc dọn ảnh không cần thiết.
            </Banner>
          )}

          {lastSyncError && (
            <Banner
              tone="danger"
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Lỗi ở lần đồng bộ gần nhất"
            >
              {lastSyncError}
            </Banner>
          )}

          {pendingSyncCount > 0 && (
            <p className="text-caption text-warn font-medium">
              Đang có {pendingSyncCount} thay đổi chờ đẩy lên GitHub.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              variant="filled"
              size="lg"
              loading={savingSync}
              leadingIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                void handleSaveDeviceAndSync();
              }}
            >
              {hasUnsavedSyncEdits ? 'Lưu cài đặt' : 'Đã lưu cài đặt'}
            </Button>
            <Button
              variant="tonal"
              size="lg"
              loading={testingConn}
              leadingIcon={<ShieldAlert className="w-5 h-5" />}
              onClick={() => {
                void handleTestConnection();
              }}
            >
              Kiểm tra kết nối
            </Button>
            <Button
              variant="outlined"
              size="lg"
              loading={isSyncing}
              disabled={(!isSyncConfigured && !githubToken.trim()) || isSyncing}
              leadingIcon={<RefreshCw className="w-5 h-5" />}
              onClick={() => {
                void handleManualSync();
              }}
            >
              Đồng bộ ngay
            </Button>
          </div>
        </Card>
      </section>

      {/* Backup & Restore JSON (T02 AC7 & AC8) */}
      <section aria-labelledby="sec-backup-heading">
        <h2 id="sec-backup-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Sao lưu &amp; Khôi phục thủ công (JSON)
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
                Tệp xuất không bao giờ chứa GitHub token hay khóa API.
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

      {/* Notifications & Reminders (SPEC M6, T05 AC5 & AC6) */}
      <section aria-labelledby="sec-notify-heading">
        <h2 id="sec-notify-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Nhắc nhở &amp; Thông báo việc cần làm
        </h2>
        <Card padding="none">
          <ListItem
            leadingIcon={<Bell className="w-5.5 h-5.5" />}
            leadingTone={notifyCap?.permission === 'granted' ? 'ok' : notifyCap?.permission === 'denied' ? 'danger' : 'info'}
            title="Quyền thông báo"
            subtitle="Tối đa 1 thông báo/ngày, không làm phiền 21:00–06:00 giờ VN"
            trailing={
              <StatusPill
                tone={
                  notifyCap?.permission === 'granted'
                    ? 'ok'
                    : notifyCap?.permission === 'denied'
                      ? 'danger'
                      : 'neutral'
                }
                icon={
                  notifyCap?.permission === 'granted' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )
                }
              >
                {notifyCap?.permission === 'granted'
                  ? 'Đã cấp'
                  : notifyCap?.permission === 'denied'
                    ? 'Đã chặn'
                    : notifyCap?.permission === 'unsupported'
                      ? 'Không hỗ trợ'
                      : 'Chưa bật'}
              </StatusPill>
            }
          />
          <ListItem
            divider
            title="Nhắc việc nền (periodicsync)"
            subtitle="Tự kiểm tra danh sách việc mỗi 12 giờ khi cài app từ Chrome Android"
            trailing={
              <StatusPill
                tone={notifyCap?.periodicSyncSupported ? 'ok' : 'warn'}
                icon={
                  notifyCap?.periodicSyncSupported ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )
                }
              >
                {notifyCap?.periodicSyncSupported ? 'Hỗ trợ' : 'Chưa hỗ trợ'}
              </StatusPill>
            }
          />
          <ListItem
            divider
            title="Lần thông báo gần nhất"
            subtitle={formatDateTimeVN(settings?.notify?.lastNotifiedAt)}
          />
          <div className="px-4 py-3.5 border-t border-surface-2 flex flex-wrap gap-2.5">
            {settings?.notify?.enabled && notifyCap?.permission === 'granted' ? (
              <Button
                variant="tonal"
                size="lg"
                loading={updatingNotify}
                leadingIcon={<BellOff className="w-5 h-5" />}
                onClick={() => {
                  void handleDisableNotify();
                }}
              >
                Tắt nhắc nhở
              </Button>
            ) : (
              <Button
                variant="filled"
                size="lg"
                loading={updatingNotify}
                leadingIcon={<Bell className="w-5 h-5" />}
                onClick={() => {
                  void handleEnableNotify();
                }}
              >
                Bật nhắc nhở
              </Button>
            )}
            <Button
              variant="outlined"
              size="lg"
              loading={sendingTestNotify}
              leadingIcon={<Send className="w-5 h-5" />}
              onClick={() => {
                void handleSendTestNotification();
              }}
            >
              Gửi thông báo thử
            </Button>
          </div>
        </Card>
      </section>

      {/* Gemini AI Assistant Settings (SPEC M7 & T06 AC1 — zero hard-coded models) */}
      <section aria-labelledby="sec-gemini-heading">
        <div className="flex items-center justify-between gap-2 px-0.5 mb-2 flex-wrap">
          <h2 id="sec-gemini-heading" className="text-title font-bold text-text">
            Trợ lý AI (Gemini)
          </h2>
          <StatusPill
            tone={settings?.geminiApiKey?.trim() ? 'ok' : 'neutral'}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {settings?.geminiApiKey?.trim() ? 'Đã cấu hình' : 'Chưa nhập key'}
          </StatusPill>
        </div>

        <Card padding="md" className="space-y-4">
          <TextField
            label="Gemini API Key (Google AI Studio)"
            type={showGeminiKey ? 'text' : 'password'}
            placeholder="AIza..."
            value={geminiApiKey}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            helperText="Chỉ lưu cục bộ trên máy này, không xuất vào tệp JSON và không đồng bộ lên GitHub."
            onChange={(e) => {
              setDraftGeminiKey(e.target.value);
              setGeminiCheck(null);
            }}
            suffix={
              <IconButton
                label={showGeminiKey ? 'Ẩn Gemini API key' : 'Hiện Gemini API key'}
                onClick={() => setShowGeminiKey((v) => !v)}
                className="-mr-2"
              >
                {showGeminiKey ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </IconButton>
            }
          />

          <SelectField
            label="Model Gemini (tải trực tiếp từ API)"
            value={geminiModel}
            options={
              geminiModels.length > 0
                ? geminiModels.map((m) => ({
                    value: m.name,
                    label: m.displayName
                      ? `${modelLabel(m.name)} (${m.displayName})`
                      : modelLabel(m.name),
                  }))
                : geminiModel
                  ? [{ value: geminiModel, label: modelLabel(geminiModel) }]
                  : [{ value: '', label: '— Bấm "Kiểm tra & tải model" để lấy danh sách —' }]
            }
            helperText="Danh sách lấy từ GET /v1beta/models. Khi model đang chọn báo quá tải (HTTP 503), hãy đổi sang bản nhẹ hơn (ví dụ Flash-Lite) rồi bấm Lưu cài đặt AI."
            onChange={(e) => setDraftGeminiModel(e.target.value)}
          />

          <Banner tone="info" icon={<Info className="w-5 h-5" />}>
            Gói miễn phí: Google có thể dùng nội dung gửi lên để cải thiện dịch vụ. Khi chưa nhập
            key hoặc đang ngoại tuyến, mọi nút AI sẽ tự chuyển thành <strong>Copy Prompt</strong>.
          </Banner>

          {geminiCheck && (
            <Banner
              tone={geminiCheck.ok ? 'ok' : 'danger'}
              icon={
                geminiCheck.ok ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )
              }
            >
              {geminiCheck.message}
            </Banner>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="filled"
              size="lg"
              loading={savingGemini}
              leadingIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                void handleSaveGeminiSettings();
              }}
            >
              Lưu cài đặt AI
            </Button>
            <Button
              variant="tonal"
              size="lg"
              loading={loadingModels}
              leadingIcon={<Sparkles className="w-5 h-5" />}
              onClick={() => {
                void handleTestAndLoadGeminiModels();
              }}
            >
              Kiểm tra &amp; tải model
            </Button>
          </div>
        </Card>
      </section>

      {/* AI Self-Learning Memory Manager (SPEC M7.1 & T07 AC3) */}
      <AiMemoryManager
        memories={aiMemories}
        trees={trees}
        logs={logs}
        hapticsEnabled={hapticsEnabled}
        onAddMemory={onAddAiMemory}
        onEditMemory={onEditAiMemory}
        onDeleteMemory={onDeleteAiMemory}
        onNotify={onNotify}
      />

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

      {/* Storage & Version Info (T04 AC9, SPEC §7.0) */}
      <section aria-labelledby="sec-storage-heading">
        <h2 id="sec-storage-heading" className="text-title font-bold text-text px-0.5 mb-2">
          Lưu trữ ngoại tuyến &amp; Phiên bản
        </h2>
        <Card padding="none">
          <ListItem
            title="Phiên bản ứng dụng"
            subtitle="Tự cập nhật khi có bản mới"
            trailing={<span className="font-mono text-text">v{appVersion}</span>}
          />
          <ListItem
            divider
            leadingIcon={<HardDrive className="w-5.5 h-5.5" />}
            leadingTone={persisted ? 'ok' : 'warn'}
            title="Bộ nhớ bền vững"
            subtitle={
              persisted
                ? `Đang dùng ${usageLabel}${quotaBytes !== null ? ` / ${quotaLabel}` : ''}`
                : `Đang dùng ${usageLabel}${quotaBytes !== null ? ` / ${quotaLabel}` : ''} · Nên cài app ra màn hình chính & bật đồng bộ`
            }
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
          {persistedRepoSizeKB !== undefined && (
            <ListItem
              divider
              leadingIcon={<Cloud className="w-5.5 h-5.5" />}
              leadingTone={persistedRepoSizeKB > REPO_SIZE_WARN_KB ? 'warn' : 'ok'}
              title="Dung lượng repo dữ liệu"
              subtitle="Khuyến nghị giữ dưới 800 MB"
              trailing={
                <StatusPill
                  tone={persistedRepoSizeKB > REPO_SIZE_WARN_KB ? 'warn' : 'ok'}
                  icon={
                    persistedRepoSizeKB > REPO_SIZE_WARN_KB ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )
                  }
                >
                  {formatSizeMb(persistedRepoSizeKB)}
                </StatusPill>
              }
            />
          )}
        </Card>
      </section>

      {/* Mandatory Chrome Data-Loss Warning (SPEC §7.0 & T04 AC9) */}
      <Banner
        tone="danger"
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Lưu ý giữ an toàn dữ liệu trên Chrome"
      >
        Gỡ app hoặc xóa dữ liệu trang của Chrome sẽ xóa dữ liệu trên máy này. Hãy bật đồng bộ
        GitHub để luôn có bản sao.
      </Banner>

      {showDesignEntry && (
        <Card padding="none">
          <ListItem
            leadingIcon={<Palette className="w-5.5 h-5.5" />}
            leadingTone="ph"
            title="Hệ thống thiết kế (#/design)"
            subtitle="Xem toàn bộ component ở các trạng thái"
            showChevron
            onClick={onOpenDesignShowcase}
          />
        </Card>
      )}

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
              {pendingImport.counts.aiMemories &&
                pendingImport.counts.aiMemories.added + pendingImport.counts.aiMemories.updated > 0 && (
                  <ListItem
                    divider
                    title="Ghi nhớ trợ lý AI"
                    trailing={`+${pendingImport.counts.aiMemories.added} mới · ${pendingImport.counts.aiMemories.updated} cập nhật`}
                  />
                )}
            </Card>
          </div>
        )}
      </Dialog>
    </div>
  );
}
