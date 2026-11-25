import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Scissors,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { copyTextToClipboard } from '../../hooks/clipboard';
import { formatDateVN, todayVN } from '../../lib/date';
import { formatBytesVN } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import {
  buildPrunePrompt,
  PRUNE_ANGLES,
  PRUNE_REMINDERS,
  PRUNE_SIGNS,
  pruneLevel,
  pruneLogNote,
  type PruneLevel,
} from '../../lib/pruning';
import type { Photo, PhotoKind, Season, Tree } from '../../types/models';
import {
  Banner,
  Button,
  Card,
  Dialog,
  EmptyState,
  ListItem,
  PhotoLightbox,
  SelectField,
  StatusPill,
  TextField,
  type SemanticTone,
} from '../ui';

interface PruningScreenProps {
  trees: Tree[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  season: Season;
  hapticsEnabled: boolean;
  canUseAi?: boolean;
  onSavePruningAssessment: (tree: Tree, note: string) => Promise<void>;
  onCapturePrunePhoto: (tree: Tree, file: File, kind: PhotoKind) => Promise<void>;
  getPhotoFullUrl: (photoId: string) => Promise<string | null>;
  onEnsureRemotePhoto?: (photoId: string) => Promise<void>;
  onAskAiPruning?: (tree: Tree, question: string, photoIds: string[]) => void;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

const LEVEL_TONE: Record<PruneLevel, SemanticTone> = {
  'khong-can': 'ok',
  nhe: 'info',
  vua: 'warn',
  manh: 'danger',
};

/**
 * M3 Pruning analysis screen (SPEC M3, T03 AC1 & AC2, T06 AC5):
 * - Tree selector + 6-sign checklist with live pruneLevel(signs) evaluation
 * - Rootstock sucker immediate warning banner
 * - 3 guided photo angle cards (prune-overview, prune-under, prune-closeup)
 * - "Lưu: Cần cắt tỉa" (flags tree + creates 'cat-tia' log) & "Phân tích bằng AI" / "Copy Prompt cắt tỉa"
 * - Pruning safety & Phytophthora disinfection reminder box
 */
export function PruningScreen({
  trees,
  photos,
  thumbUrls,
  season,
  hapticsEnabled,
  canUseAi = false,
  onSavePruningAssessment,
  onCapturePrunePhoto,
  getPhotoFullUrl,
  onEnsureRemotePhoto,
  onAskAiPruning,
  onNotify,
}: PruningScreenProps) {
  const today = todayVN();

  const [selectedTreeId, setSelectedTreeId] = useState<string>(
    () => trees.find((t) => t.needsPruning)?.id ?? trees[0]?.id ?? '',
  );
  const [signs, setSigns] = useState<boolean[]>(() => PRUNE_SIGNS.map(() => false));
  const [saving, setSaving] = useState(false);
  const [capturingKind, setCapturingKind] = useState<PhotoKind | null>(null);
  const [fallbackPromptText, setFallbackPromptText] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    caption: string;
    subcaption: string;
  } | null>(null);

  const activeCaptureKindRef = useRef<PhotoKind>('prune-overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTree = useMemo(
    () => trees.find((t) => t.id === selectedTreeId) ?? trees[0] ?? null,
    [selectedTreeId, trees],
  );

  const assessment = useMemo(() => pruneLevel(signs), [signs]);

  const treeOptions = useMemo(
    () =>
      trees.map((t) => ({
        value: t.id,
        label: `${t.label || t.code} · Lô ${t.lot}${t.needsPruning ? ' (Cần cắt tỉa)' : ''}`,
      })),
    [trees],
  );

  const latestAnglePhotos = useMemo(() => {
    const map = new Map<PhotoKind, Photo>();
    if (!selectedTree) return map;
    for (const p of photos) {
      if (p.deletedAt || p.targetId !== selectedTree.id) continue;
      if (
        p.kind !== 'prune-overview' &&
        p.kind !== 'prune-under' &&
        p.kind !== 'prune-closeup'
      ) {
        continue;
      }
      const prev = map.get(p.kind);
      if (
        !prev ||
        p.takenAt > prev.takenAt ||
        (p.takenAt === prev.takenAt && p.updatedAt > prev.updatedAt)
      ) {
        map.set(p.kind, p);
      }
    }
    return map;
  }, [photos, selectedTree]);

  useEffect(() => {
    if (!onEnsureRemotePhoto) return;
    for (const photo of latestAnglePhotos.values()) {
      if (photo.remotePath && !thumbUrls.has(photo.id)) {
        void onEnsureRemotePhoto(photo.id);
      }
    }
  }, [latestAnglePhotos, onEnsureRemotePhoto, thumbUrls]);

  const toggleSign = (index: number) => {
    setSigns((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSaveNeedsPruning = async () => {
    if (!selectedTree) return;
    setSaving(true);
    try {
      const note = pruneLogNote(signs);
      await onSavePruningAssessment(selectedTree, note);
      triggerHaptic(hapticsEnabled);
      onNotify(`Đã lưu cờ Cần cắt tỉa và tạo nhật ký cho ${selectedTree.code}.`, 'ok');
    } catch {
      onNotify('Không lưu được đánh giá cắt tỉa lúc này.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!selectedTree) return;
    const text = buildPrunePrompt({
      tree: selectedTree,
      signs,
      season,
      today,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      triggerHaptic(hapticsEnabled);
      onNotify(`Đã copy Prompt cắt tỉa cho ${selectedTree.code}`, 'ok');
    } else {
      setFallbackPromptText(text);
    }
  };

  const handleTriggerPhoto = (kind: PhotoKind) => {
    activeCaptureKindRef.current = kind;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file || !selectedTree) return;
    const kind = activeCaptureKindRef.current;
    setCapturingKind(kind);
    try {
      await onCapturePrunePhoto(selectedTree, file, kind);
      triggerHaptic(hapticsEnabled);
      const angle = PRUNE_ANGLES.find((a) => a.kind === kind);
      onNotify(`Đã lưu ảnh "${angle?.title ?? 'cắt tỉa'}" cho ${selectedTree.code}.`, 'ok');
    } catch {
      onNotify('Không đọc hoặc nén được ảnh vừa chọn.', 'danger');
    } finally {
      setCapturingKind(null);
    }
  };

  const handleOpenLightbox = async (photo: Photo, title: string) => {
    const url = await getPhotoFullUrl(photo.id);
    if (!url || !selectedTree) {
      onNotify(
        photo.remotePath
          ? 'Ảnh gốc chưa có trên máy này. Hãy kết nối mạng để tải từ GitHub.'
          : 'Ảnh gốc chưa có trên máy này.',
        'warn',
      );
      return;
    }
    setLightbox({
      src: url,
      caption: `${selectedTree.code} · ${title}`,
      subcaption: `${formatDateVN(photo.takenAt)} · ${photo.width}×${photo.height} · ${formatBytesVN(photo.bytes)}`,
    });
  };

  if (!selectedTree) {
    return (
      <EmptyState
        illustration="durian"
        title="Chưa có cây cá thể để đánh giá cắt tỉa"
        description="Vào mục Cây để thêm cây hoặc tách cây từ Lô A trước khi thực hiện đánh giá cắt tỉa."
      />
    );
  }

  const levelTone = LEVEL_TONE[assessment.level];

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Chụp hoặc chọn ảnh góc cắt tỉa"
        onChange={(e) => {
          void handleFileChange(e.target.files?.[0]);
        }}
      />

      <div className="rail:grid rail:grid-cols-12 rail:gap-5 space-y-4 rail:space-y-0 items-start">
        {/* Left column: Tree selector + 6-sign checklist + Actions */}
        <div className="rail:col-span-6 space-y-4">
          <Card padding="md" className="space-y-3">
            <SelectField
              label="Chọn cây đánh giá cắt tỉa"
              value={selectedTree.id}
              options={treeOptions}
              onChange={(e) => {
                setSelectedTreeId(e.target.value);
                setSigns(PRUNE_SIGNS.map(() => false));
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  tone={levelTone}
                  icon={
                    assessment.level === 'khong-can' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Scissors className="w-4 h-4" />
                    )
                  }
                >
                  Mức cắt tỉa: {assessment.label} ({assessment.count}/6)
                </StatusPill>
                {selectedTree.needsPruning && (
                  <StatusPill tone="sec" icon={<Scissors className="w-4 h-4" />}>
                    Đang đánh dấu Cần cắt tỉa
                  </StatusPill>
                )}
              </div>
              {assessment.count > 0 && (
                <Button
                  variant="text"
                  onClick={() => setSigns(PRUNE_SIGNS.map(() => false))}
                  className="px-3"
                >
                  Bỏ chọn hết
                </Button>
              )}
            </div>
          </Card>

          {/* Immediate rootstock sucker warning (T03 AC1) */}
          {assessment.removeSuckersNow && (
            <Banner
              tone="danger"
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Cắt bỏ chồi gốc ghép ngay"
            >
              Chồi mọc từ gốc ghép hút dinh dưỡng rất mạnh, làm suy cành ghép Ri6 — cần bấm bỏ sớm
              sát thân gốc.
            </Banner>
          )}

          {/* 6-sign checklist (SPEC §3.6, T03 AC1) */}
          <section aria-labelledby="prune-checklist-heading" className="space-y-2">
            <div className="px-0.5">
              <h2 id="prune-checklist-heading" className="text-title font-bold text-text">
                1. Đánh dấu 6 dấu hiệu trên tán
              </h2>
              <p className="text-caption text-text-3">
                0: Không cần · 1–2: Nhẹ · 3–4: Vừa · 5–6: Mạnh
              </p>
            </div>
            <Card padding="none">
              {PRUNE_SIGNS.map((sign, idx) => {
                const checked = signs[idx];
                return (
                  <button
                    key={sign}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleSign(idx)}
                    className={[
                      'pressable w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      idx > 0 ? 'border-t border-surface-2' : '',
                      checked ? 'bg-primary-container/35' : 'bg-surface',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'w-6 h-6 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors',
                        checked
                          ? 'bg-primary border-primary text-on-primary'
                          : 'bg-surface border-outline-strong text-transparent',
                      ].join(' ')}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-body font-semibold text-text leading-snug">
                        {sign}
                      </span>
                      {idx === 0 && (
                        <span className="block text-caption text-danger mt-0.5">
                          Luôn ưu tiên cắt bỏ ngay nếu có
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </Card>
          </section>

          {/* Primary actions (T03 AC2) */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="filled"
              size="lg"
              fullWidth
              loading={saving}
              leadingIcon={<Scissors className="w-5 h-5" />}
              onClick={() => {
                void handleSaveNeedsPruning();
              }}
            >
              Lưu: Cần cắt tỉa
            </Button>
            {canUseAi && onAskAiPruning ? (
              <Button
                variant="tonal"
                size="lg"
                fullWidth
                leadingIcon={<Sparkles className="w-5 h-5" />}
                onClick={() => {
                  const angleIds = PRUNE_ANGLES.map((a) => latestAnglePhotos.get(a.kind)?.id).filter(
                    (id): id is string => Boolean(id),
                  );
                  const noteSummary = pruneLogNote(signs);
                  const promptQ = `Hãy phân tích cắt tỉa cho cây ${selectedTree.code} kèm các góc ảnh đính kèm.\nKết quả đánh giá checklist: ${noteSummary}.\nNhờ tư vấn thứ tự tỉa cành, lưu ý giữ tán thoáng và tránh nấm bệnh.`;
                  onAskAiPruning(selectedTree, promptQ, angleIds);
                }}
              >
                Phân tích bằng AI
              </Button>
            ) : (
              <Button
                variant="tonal"
                size="lg"
                fullWidth
                leadingIcon={<Copy className="w-5 h-5" />}
                onClick={() => {
                  void handleCopyPrompt();
                }}
              >
                Copy Prompt cắt tỉa
              </Button>
            )}
          </div>
        </div>

        {/* Right column: 3 guided photo angles + Pruning reminders */}
        <div className="rail:col-span-6 space-y-4">
          <section aria-labelledby="prune-angles-heading" className="space-y-2.5">
            <div className="px-0.5">
              <h2 id="prune-angles-heading" className="text-title font-bold text-text">
                2. Chụp đủ 3 góc ảnh chuẩn
              </h2>
              <p className="text-caption text-text-3">
                Ảnh lưu riêng theo từng góc cho cây {selectedTree.code} để dễ so sánh hoặc gửi AI
              </p>
            </div>

            <div className="space-y-3">
              {PRUNE_ANGLES.map((angle, idx) => {
                const latest = latestAnglePhotos.get(angle.kind);
                const thumb = latest ? thumbUrls.get(latest.id) : undefined;
                const isCapturing = capturingKind === angle.kind;

                return (
                  <Card key={angle.kind} padding="md">
                    <div className="flex items-start gap-3">
                      {latest ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleOpenLightbox(latest, angle.title);
                          }}
                          className="pressable w-20 h-20 rounded-md overflow-hidden bg-surface-2 shrink-0 shadow-e1 flex flex-col items-center justify-center gap-1 text-text-2"
                          aria-label={`Xem lớn ảnh ${angle.title}`}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={`Ảnh ${angle.title} cây ${selectedTree.code}`}
                              width={160}
                              height={160}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                              <span className="text-label font-semibold leading-tight px-1 text-center">
                                {latest.remotePath ? 'Tải ảnh' : `Góc ${idx + 1}`}
                              </span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-md border-2 border-dashed border-outline-strong bg-bg flex flex-col items-center justify-center gap-1 shrink-0 text-text-3"
                          aria-hidden="true"
                        >
                          <Camera className="w-5.5 h-5.5 text-primary" />
                          <span className="text-label font-bold">Góc {idx + 1}</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-body font-bold text-text leading-snug">
                            Góc {idx + 1}: {angle.title}
                          </h3>
                          {latest && (
                            <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
                              {formatDateVN(latest.takenAt)}
                            </StatusPill>
                          )}
                        </div>
                        <p className="text-caption text-text-2 leading-snug">{angle.hint}</p>
                        <div className="pt-1">
                          <Button
                            variant={latest ? 'outlined' : 'tonal'}
                            loading={isCapturing}
                            leadingIcon={<Camera className="w-4 h-4" />}
                            onClick={() => handleTriggerPhoto(angle.kind)}
                          >
                            {latest ? 'Chụp lại góc này' : `Chụp góc ${idx + 1}`}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Pruning reminders card (SPEC §3.6 & T03 AC2) */}
          <section aria-labelledby="prune-reminders-heading" className="space-y-2">
            <h2 id="prune-reminders-heading" className="text-title font-bold text-text px-0.5">
              3. Nhắc an toàn khi cắt tỉa
            </h2>
            <Card padding="none">
              {PRUNE_REMINDERS.map((rule, idx) => (
                <ListItem
                  key={rule}
                  divider={idx > 0}
                  leadingIcon={
                    idx === PRUNE_REMINDERS.length - 1 ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )
                  }
                  leadingTone={idx === PRUNE_REMINDERS.length - 1 ? 'danger' : 'warn'}
                  title={rule}
                />
              ))}
            </Card>
          </section>
        </div>
      </div>

      {/* Manual copy fallback Dialog when clipboard is blocked */}
      <Dialog
        open={Boolean(fallbackPromptText)}
        title="Sao chép Prompt cắt tỉa thủ công"
        subtitle="Trình duyệt chặn ghi tự động vào khay nhớ tạm — hãy chọn và sao chép đoạn chữ dưới đây."
        onClose={() => setFallbackPromptText(null)}
        footer={
          <Button variant="filled" onClick={() => setFallbackPromptText(null)}>
            Đóng
          </Button>
        }
      >
        <TextField
          label="Nội dung Prompt cắt tỉa"
          multiline
          rows={8}
          readOnly
          value={fallbackPromptText ?? ''}
          onFocus={(e) => e.currentTarget.select()}
        />
      </Dialog>

      <PhotoLightbox
        open={Boolean(lightbox)}
        src={lightbox?.src ?? null}
        caption={lightbox?.caption}
        subcaption={lightbox?.subcaption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
