import {
  AlertTriangle,
  BookMarked,
  Brain,
  CalendarPlus,
  Camera,
  Check,
  Copy,
  Edit3,
  History,
  ImagePlus,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteAiChat, listAiChats, saveAiChat } from '../../db/aiChats';
import { db } from '../../db/database';
import { generateDeviceId, LOT_A_ID } from '../../db/seed';
import { copyTextToClipboard } from '../../hooks/clipboard';
import { compressForAi } from '../../hooks/photoCapture';
import type { AgendaItem } from '../../lib/agenda/agenda';
import {
  AiError,
  type ChatTurn,
  createGeminiClient,
  rememberSchemaUnsupported,
} from '../../lib/ai/gemini';
import {
  AI_MEMORY_CATEGORIES,
  AI_MEMORY_CATEGORY_LABEL,
  deduplicateMemories,
  looksSensitive,
  type MemoryProposal,
} from '../../lib/ai/memory';
import { modelLabel, pickDefaultModel } from '../../lib/ai/models';
import type { AiAction, AiConfidence } from '../../lib/ai/parse';
import { AI_DISCLAIMER, buildCopyPromptFallback, buildSystemPrompt } from '../../lib/ai/prompt';
import { addDays, formatDateVN, nowUTC, todayVN } from '../../lib/date';
import { triggerHaptic } from '../../lib/haptics';
import { PHOTO_KIND_LABEL } from '../../lib/labels';
import type {
  AiChat,
  AiChatMessage,
  AiMemory,
  AiMemoryCategory,
  ISODate,
  Log,
  Photo,
  Season,
  Settings,
  Tree,
} from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  SelectField,
  StatusPill,
  TextField,
  type SemanticTone,
} from '../ui';

const MAX_ATTACHMENTS = 3;

const MEMORY_CATEGORY_OPTIONS = AI_MEMORY_CATEGORIES.map((cat) => ({
  value: cat,
  label: AI_MEMORY_CATEGORY_LABEL[cat],
}));

export interface AiLaunchPreset {
  targetId?: string;
  initialQuestion?: string;
  initialPhotoIds?: string[];
  nonce: number;
}

interface AttachedAiPhoto {
  id: string;
  label: string;
  mime: string;
  base64: string;
  previewUrl: string;
  sourcePhotoId?: string;
}

interface RenderedTurn extends AiChatMessage {
  confidence?: AiConfidence | null;
  actions?: AiAction[];
  learnedMemories?: MemoryProposal[];
  usedSchema?: boolean;
}

export interface AiChatSheetProps {
  open: boolean;
  preset: AiLaunchPreset | null;
  isOnline: boolean;
  season: Season;
  trees: Tree[];
  logs: Log[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  agendaItems: AgendaItem[];
  memories: AiMemory[];
  settings: Settings | null;
  hapticsEnabled: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => Promise<void>;
  onAddAiTask: (input: { title: string; dueDate: ISODate; targetId?: string }) => Promise<void>;
  onSaveAiLog: (input: { targetId: string; note: string }) => Promise<void>;
  onSaveAiMemory: (proposal: MemoryProposal & { source: 'ai'; approved: true }) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

const CONFIDENCE_META: Record<AiConfidence, { label: string; tone: SemanticTone }> = {
  cao: { label: 'Tin cậy: Cao', tone: 'ok' },
  vua: { label: 'Tin cậy: Vừa', tone: 'warn' },
  thap: { label: 'Tin cậy: Thấp', tone: 'danger' },
};

function renderFormattedText(text: string) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return blocks.map((block, bIdx) => {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l));
    if (isList) {
      return (
        <ul key={bIdx} className="list-disc pl-5 space-y-1">
          {lines.map((line, lIdx) => (
            <li key={lIdx} className="text-body text-text leading-relaxed">
              {renderInlineBold(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bIdx} className="text-body text-text leading-relaxed whitespace-pre-line">
        {renderInlineBold(block)}
      </p>
    );
  });
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={idx} className="font-semibold text-text">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

/**
 * M7 Gemini AI Assistant Sheet (SPEC M7, T06 AC4–AC7):
 * - Multi-turn Vietnamese chat with optional tree context & up to 3 compressed images (<= 1280 px)
 * - Local-only Dexie `aiChats` history (max 50, deletable)
 * - Structured actions -> "Thêm vào Việc cần làm" (`source: 'ai'`) & "Lưu vào nhật ký" (`type: 'ai'`)
 * - Permanent AI_DISCLAIMER under every AI answer
 * - Automatic HTTP 400 schema fallback + Offline/No-Key Copy Prompt mode
 */
export function AiChatSheet(props: AiChatSheetProps) {
  if (!props.open) return null;
  return <AiChatSheetInner key={props.preset?.nonce ?? 0} {...props} />;
}

function AiChatSheetInner({
  preset,
  isOnline,
  season,
  trees,
  logs,
  photos,
  thumbUrls,
  agendaItems,
  memories,
  settings,
  hapticsEnabled,
  onClose,
  onOpenSettings,
  onUpdateSettings,
  onAddAiTask,
  onSaveAiLog,
  onSaveAiMemory,
  onNotify,
}: AiChatSheetProps) {
  const today = todayVN();
  const [chatId, setChatId] = useState<string>(() => generateDeviceId());
  const [targetId, setTargetId] = useState<string>(preset?.targetId ?? '');
  const [question, setQuestion] = useState<string>(preset?.initialQuestion ?? '');
  const [turns, setTurns] = useState<RenderedTurn[]>([]);
  const [attachments, setAttachments] = useState<AttachedAiPhoto[]>([]);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [treePickerOpen, setTreePickerOpen] = useState(false);
  const [historyList, setHistoryList] = useState<AiChat[]>([]);
  const [addedActionKeys, setAddedActionKeys] = useState<Set<string>>(() => new Set());
  const [savedLogMessageIds, setSavedLogMessageIds] = useState<Set<string>>(() => new Set());
  const [dismissedMemoryKeys, setDismissedMemoryKeys] = useState<Set<string>>(() => new Set());
  const [savedMemoryKeys, setSavedMemoryKeys] = useState<Set<string>>(() => new Set());
  const [editingMemory, setEditingMemory] = useState<{
    key: string;
    content: string;
    category: AiMemoryCategory;
    targetIds?: string[];
    confidence?: 'thap' | 'vua' | 'cao';
    error?: string;
  } | null>(null);
  const [fallbackPromptText, setFallbackPromptText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = Boolean(settings?.geminiApiKey?.trim());
  const canCallGemini = isOnline && hasApiKey;

  const selectedTree = useMemo(
    () => (targetId ? trees.find((t) => t.id === targetId) : undefined),
    [targetId, trees],
  );

  const validTargetIds = useMemo(
    () => new Set<string>([LOT_A_ID, ...trees.map((t) => t.id)]),
    [trees],
  );

  const treePhotos = useMemo(() => {
    if (!targetId) return [];
    return photos
      .filter((p) => !p.deletedAt && p.targetId === targetId)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
      .slice(0, 12);
  }, [photos, targetId]);

  const targetOptions = useMemo(
    () => [
      { value: '', label: 'Toàn vườn (không chọn cây riêng)' },
      ...trees.map((t) => ({
        value: t.id,
        label: t.location ? `${t.code} · ${t.location}` : t.code,
      })),
    ],
    [trees],
  );

  useEffect(() => {
    let active = true;
    void listAiChats().then((list) => {
      if (active) setHistoryList(list);
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-attach preset photos (e.g. from TreeProfileScreen or PruningScreen "Phân tích bằng AI")
  useEffect(() => {
    const ids = preset?.initialPhotoIds?.slice(0, MAX_ATTACHMENTS) ?? [];
    if (ids.length === 0) return;
    let active = true;
    void (async () => {
      const loaded: AttachedAiPhoto[] = [];
      for (const pid of ids) {
        const rec = await db.photoBlobs.get(pid);
        if (!rec?.blob) continue;
        try {
          const compressed = await compressForAi(rec.blob);
          const meta = photos.find((p) => p.id === pid);
          loaded.push({
            id: generateDeviceId(),
            label: meta ? PHOTO_KIND_LABEL[meta.kind] : 'Ảnh cây',
            mime: compressed.mime,
            base64: compressed.base64,
            previewUrl: compressed.previewUrl,
            sourcePhotoId: pid,
          });
        } catch {
          // Ignore unreadable preset blob
        }
      }
      if (active && loaded.length > 0) {
        setAttachments(loaded);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce]);

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt({
        season,
        today,
        tree: selectedTree,
        trees,
        logs,
        agenda: agendaItems,
        memories,
      }),
    [agendaItems, logs, memories, season, selectedTree, today, trees],
  );

  const handleAttachFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      onNotify(`Chỉ đính kèm tối đa ${MAX_ATTACHMENTS} ảnh mỗi lượt hỏi.`, 'warn');
      return;
    }
    const chosen = Array.from(fileList).slice(0, remaining);
    const next: AttachedAiPhoto[] = [];
    for (const file of chosen) {
      try {
        const compressed = await compressForAi(file);
        next.push({
          id: generateDeviceId(),
          label: file.name || 'Ảnh chụp mới',
          mime: compressed.mime,
          base64: compressed.base64,
          previewUrl: compressed.previewUrl,
        });
      } catch {
        onNotify('Không nén được ảnh vừa chọn.', 'danger');
      }
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACHMENTS));
    }
  };

  const handlePickTreePhoto = async (photo: Photo) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      onNotify(`Đã đủ tối đa ${MAX_ATTACHMENTS} ảnh đính kèm.`, 'warn');
      return;
    }
    if (attachments.some((a) => a.sourcePhotoId === photo.id)) {
      onNotify('Ảnh này đã được đính kèm rồi.', 'info');
      return;
    }
    const rec = await db.photoBlobs.get(photo.id);
    if (!rec?.blob) {
      onNotify('Ảnh chưa có bản lưu trên máy này.', 'warn');
      return;
    }
    try {
      const compressed = await compressForAi(rec.blob);
      setAttachments((prev) =>
        [
          ...prev,
          {
            id: generateDeviceId(),
            label: `${PHOTO_KIND_LABEL[photo.kind]} (${formatDateVN(photo.takenAt)})`,
            mime: compressed.mime,
            base64: compressed.base64,
            previewUrl: compressed.previewUrl,
            sourcePhotoId: photo.id,
          },
        ].slice(0, MAX_ATTACHMENTS),
      );
      setTreePickerOpen(false);
    } catch {
      onNotify('Không xử lý được ảnh cây đã chọn.', 'danger');
    }
  };

  const handleCopyPromptFallback = async () => {
    const cleanQ = question.trim() || 'Hãy tư vấn chăm sóc vườn Ri6 hiện tại.';
    const text = buildCopyPromptFallback(systemPrompt, cleanQ);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      triggerHaptic(hapticsEnabled);
      onNotify('Đã copy Prompt kèm ngữ cảnh vườn để dán vào app AI bất kỳ.', 'ok');
    } else {
      setFallbackPromptText(text);
    }
  };

  const handleSend = async () => {
    const cleanQ = question.trim();
    if (!cleanQ) {
      onNotify('Hãy nhập câu hỏi trước khi gửi.', 'warn');
      return;
    }
    if (!canCallGemini) {
      await handleCopyPromptFallback();
      return;
    }

    const apiKey = settings?.geminiApiKey?.trim() ?? '';
    setSending(true);
    try {
      const client = createGeminiClient(apiKey);
      let model = settings?.geminiModel?.trim() ?? '';
      if (!model) {
        const models = await client.listChatModels();
        const picked = pickDefaultModel(models);
        if (!picked) {
          onNotify('Không tìm thấy model Gemini phù hợp cho API key này.', 'danger');
          return;
        }
        model = picked;
        await onUpdateSettings({ geminiModel: model });
      }

      const apiTurns: ChatTurn[] = [
        ...turns.map((t) => ({ role: t.role, text: t.content })),
        {
          role: 'user',
          text: cleanQ,
          ...(attachments.length > 0
            ? { images: attachments.map((a) => ({ mime: a.mime, base64: a.base64 })) }
            : {}),
        },
      ];

      const res = await client.generate({
        model,
        systemPrompt,
        turns: apiTurns,
        validTargetIds,
        schemaUnsupported: settings?.geminiSchemaUnsupported,
      });

      if (res.schemaUnsupportedDetected) {
        const nextUnsupported = rememberSchemaUnsupported(
          settings?.geminiSchemaUnsupported,
          model,
        );
        await onUpdateSettings({ geminiSchemaUnsupported: nextUnsupported });
      }

      const now = nowUTC();
      const userMsg: RenderedTurn = {
        id: generateDeviceId(),
        role: 'user',
        content: cleanQ,
        createdAt: now,
        photoIds: attachments.map((a) => a.sourcePhotoId ?? a.id),
      };
      const modelMsg: RenderedTurn = {
        id: generateDeviceId(),
        role: 'model',
        content: res.answer || 'Trợ lý chưa trả về nội dung cụ thể.',
        createdAt: nowUTC(),
        confidence: res.confidence,
        actions: res.actions,
        learnedMemories: res.learnedMemories,
        usedSchema: res.usedSchema,
      };

      const nextTurns = [...turns, userMsg, modelMsg];
      setTurns(nextTurns);
      setQuestion('');
      setAttachments([]);

      const persistedMessages: AiChatMessage[] = nextTurns.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        ...(m.photoIds?.length ? { photoIds: m.photoIds } : {}),
        ...(m.role === 'model' && m.confidence ? { confidence: m.confidence } : {}),
        ...(m.role === 'model' && m.actions?.length ? { actions: m.actions } : {}),
      }));
      const chatRecord: AiChat = {
        id: chatId,
        title:
          (selectedTree ? `${selectedTree.code}: ` : '') +
          (persistedMessages[0]?.content.slice(0, 60) || 'Hỏi trợ lý AI'),
        ...(targetId ? { targetId } : {}),
        messages: persistedMessages,
        createdAt: persistedMessages[0]?.createdAt ?? now,
        updatedAt: nowUTC(),
      };
      await saveAiChat(chatRecord);
      setHistoryList(await listAiChats());
      triggerHaptic(hapticsEnabled);
    } catch (err) {
      // AC7: On 401/429/network errors, keep user's question & attachments intact for retry!
      if (err instanceof AiError) {
        onNotify(err.message, 'danger');
      } else {
        onNotify('Không gửi được câu hỏi tới Gemini. Câu hỏi của bạn vẫn được giữ nguyên.', 'danger');
      }
    } finally {
      setSending(false);
    }
  };

  const handleLoadChat = (chat: AiChat) => {
    setChatId(chat.id);
    setTargetId(chat.targetId ?? '');
    setTurns(chat.messages);
    setHistoryOpen(false);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteAiChat(id);
    const updated = await listAiChats();
    setHistoryList(updated);
    if (chatId === id) {
      setChatId(generateDeviceId());
      setTurns([]);
    }
    onNotify('Đã xóa cuộc hội thoại AI khỏi máy.', 'info');
  };

  const handleNewChat = () => {
    setChatId(generateDeviceId());
    setTurns([]);
    setAttachments([]);
    setQuestion('');
    setHistoryOpen(false);
  };

  const activeModelName = settings?.geminiModel ? modelLabel(settings.geminiModel) : 'Tự chọn từ API';

  return (
    <>
      <BottomSheet
        open
        title="Trợ lý AI Vườn Ri6"
        subtitle={
          canCallGemini
            ? `Gemini · ${activeModelName}`
            : !isOnline
              ? 'Đang ngoại tuyến — chế độ Copy Prompt'
              : 'Chưa nhập Gemini API key — chế độ Copy Prompt'
        }
        onClose={onClose}
        footer={
          <div className="w-full space-y-2.5">
            {/* Attached photos strip (max 3) */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-1 rounded-sm border border-outline bg-surface-2 pl-1.5 pr-0.5 py-0.5"
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.label}
                      className="w-11 h-11 rounded-xs object-cover shrink-0"
                    />
                    <IconButton
                      label={`Bỏ ảnh ${att.label}`}
                      onClick={() =>
                        setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                      }
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <TextField
                  label="Câu hỏi cho trợ lý AI"
                  multiline
                  rows={2}
                  placeholder="Ví dụ: Lá cây SR01 bị vàng mép ở tầng dưới, nên kiểm tra và xử lý thế nào?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  aria-label="Chọn ảnh đính kèm gửi AI"
                  onChange={(e) => {
                    void handleAttachFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="tonal"
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  leadingIcon={<Camera className="w-5 h-5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ảnh ({attachments.length}/{MAX_ATTACHMENTS})
                </Button>
                {targetId && treePhotos.length > 0 && (
                  <Button
                    variant="outlined"
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                    leadingIcon={<ImagePlus className="w-5 h-5" />}
                    onClick={() => setTreePickerOpen((v) => !v)}
                  >
                    Ảnh cây
                  </Button>
                )}
              </div>

              {canCallGemini ? (
                <Button
                  variant="filled"
                  size="lg"
                  loading={sending}
                  leadingIcon={<Send className="w-5 h-5" />}
                  onClick={() => {
                    void handleSend();
                  }}
                >
                  Gửi AI
                </Button>
              ) : (
                <Button
                  variant="filled"
                  size="lg"
                  leadingIcon={<Copy className="w-5 h-5" />}
                  onClick={() => {
                    void handleCopyPromptFallback();
                  }}
                >
                  Copy Prompt
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Toolbar: Tree context picker + History & New Chat */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={historyOpen ? 'filled' : 'tonal'}
                leadingIcon={<History className="w-5 h-5" />}
                onClick={() => setHistoryOpen((v) => !v)}
              >
                Lịch sử ({historyList.length})
              </Button>
              <Button
                variant="outlined"
                leadingIcon={<MessageSquarePlus className="w-5 h-5" />}
                onClick={handleNewChat}
              >
                Mới
              </Button>
            </div>
            {!hasApiKey && (
              <Button variant="text" onClick={onOpenSettings}>
                Nhập API key
              </Button>
            )}
          </div>

          <SelectField
            label="Cây đang hỏi (tự động gửi hồ sơ & 10 nhật ký gần nhất)"
            value={targetId}
            options={targetOptions}
            onChange={(e) => setTargetId(e.target.value)}
          />

          {/* Offline / No-Key Fallback Banner (AC7) */}
          {!canCallGemini && (
            <Banner
              tone="info"
              icon={<Copy className="w-5 h-5" />}
              title={!isOnline ? 'Đang ngoại tuyến' : 'Chưa cấu hình Gemini API key'}
              action={
                !hasApiKey ? (
                  <Button variant="outlined" onClick={onOpenSettings}>
                    Mở Cài đặt AI
                  </Button>
                ) : undefined
              }
            >
              Bạn vẫn có thể nhập câu hỏi rồi bấm <strong>Copy Prompt</strong> để dán vào bất kỳ
              ứng dụng AI nào (đã tự kèm thông tin vườn, mùa và 10 nhật ký gần nhất).
            </Banner>
          )}

          {/* Optional inline picker for tree's saved local photos */}
          {treePickerOpen && treePhotos.length > 0 && (
            <Card padding="md" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-body font-bold text-text">
                  Chọn ảnh đã lưu của {selectedTree?.code ?? 'cây'}
                </strong>
                <IconButton label="Đóng chọn ảnh cây" onClick={() => setTreePickerOpen(false)}>
                  <X className="w-5 h-5" aria-hidden="true" />
                </IconButton>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {treePhotos.map((p) => {
                  const thumb = thumbUrls.get(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        void handlePickTreePhoto(p);
                      }}
                      className="pressable rounded-sm border border-outline bg-surface-2 overflow-hidden text-left min-h-14"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={PHOTO_KIND_LABEL[p.kind]}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-caption text-text-3 px-1 text-center">
                          {PHOTO_KIND_LABEL[p.kind]}
                        </div>
                      )}
                      <span className="block px-1.5 py-1 text-label text-text-2 truncate">
                        {formatDateVN(p.takenAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Local conversation history panel (max 50, deletable) */}
          {historyOpen && (
            <Card padding="md" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-body font-bold text-text">
                  Lịch sử trên máy (tối đa 50 hội thoại, không đồng bộ)
                </strong>
              </div>
              {historyList.length === 0 ? (
                <p className="text-caption text-text-3">Chưa có cuộc hội thoại nào được lưu.</p>
              ) : (
                <div className="space-y-2">
                  {historyList.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center gap-2 rounded-sm border border-outline bg-bg px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadChat(chat)}
                        className="pressable flex-1 min-w-0 min-h-12 text-left"
                      >
                        <span className="block text-body font-semibold text-text truncate">
                          {chat.title}
                        </span>
                        <span className="block text-caption text-text-3">
                          {chat.messages.length} tin nhắn
                        </span>
                      </button>
                      <IconButton
                        label={`Xóa hội thoại ${chat.title}`}
                        onClick={() => {
                          void handleDeleteChat(chat.id);
                        }}
                      >
                        <Trash2 className="w-5 h-5 text-danger" aria-hidden="true" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Chat messages */}
          {turns.length === 0 ? (
            <EmptyState
              illustration="durian"
              title="Hỏi trợ lý kỹ thuật Ri6"
              description="Hỏi bằng tiếng Việt về sâu bệnh, cắt tỉa, bón phân, tưới nước hoặc đính kèm tối đa 3 ảnh lá/tán. Trợ lý tự hiểu hồ sơ vườn, mùa vụ và nhật ký cây."
            />
          ) : (
            <div className="space-y-3">
              {turns.map((turn) => {
                if (turn.role === 'user') {
                  return (
                    <div key={turn.id} className="flex justify-end">
                      <div className="max-w-md rounded-lg bg-primary text-on-primary px-4 py-3 space-y-1">
                        <p className="text-body leading-relaxed whitespace-pre-line">
                          {turn.content}
                        </p>
                        {turn.photoIds && turn.photoIds.length > 0 && (
                          <p className="text-label opacity-90">
                            Đã đính kèm {turn.photoIds.length} ảnh
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }

                const confMeta = turn.confidence ? CONFIDENCE_META[turn.confidence] : null;
                const isSavedToLog = savedLogMessageIds.has(turn.id);

                return (
                  <Card key={turn.id} padding="md" className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-label font-bold text-primary">
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                        Trợ lý AI Ri6
                      </span>
                      {confMeta && (
                        <StatusPill tone={confMeta.tone}>{confMeta.label}</StatusPill>
                      )}
                    </div>

                    <div className="space-y-2">{renderFormattedText(turn.content)}</div>

                    {/* Structured Actions -> "Thêm vào Việc cần làm" (T06 AC5) */}
                    {turn.actions && turn.actions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-surface-2">
                        <p className="text-label font-bold text-text-2">
                          Việc đề xuất ({turn.actions.length}):
                        </p>
                        {turn.actions.map((act, idx) => {
                          const actKey = `${turn.id}:${idx}`;
                          const added = addedActionKeys.has(actKey);
                          const dueDate = addDays(today, act.dueInDays);
                          const actTree = act.targetId
                            ? trees.find((t) => t.id === act.targetId)
                            : undefined;

                          return (
                            <div
                              key={actKey}
                              className="rounded-sm border border-outline bg-bg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-body font-semibold text-text leading-snug">
                                  {act.title}
                                </p>
                                <p className="text-caption text-text-3 tabular-nums">
                                  Hạn dự kiến: {formatDateVN(dueDate)}
                                  {actTree ? ` · ${actTree.code}` : act.targetId === LOT_A_ID ? ' · Lô A' : ''}
                                </p>
                              </div>
                              <Button
                                variant={added ? 'tonal' : 'filled'}
                                disabled={added}
                                className="whitespace-nowrap shrink-0"
                                leadingIcon={
                                  added ? (
                                    <Check className="w-5 h-5" />
                                  ) : (
                                    <CalendarPlus className="w-5 h-5" />
                                  )
                                }
                                onClick={() => {
                                  void onAddAiTask({
                                    title: act.title,
                                    dueDate,
                                    targetId: act.targetId ?? (targetId || undefined),
                                  }).then(() => {
                                    setAddedActionKeys((prev) => new Set(prev).add(actKey));
                                    triggerHaptic(hapticsEnabled);
                                    onNotify(`Đã thêm vào Việc cần làm: ${act.title}`, 'ok');
                                  });
                                }}
                              >
                                {added ? 'Đã thêm việc' : 'Thêm vào Việc cần làm'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Self-Learning Memory Proposals (SPEC M7.1 & T07 AC3) */}
                    {(() => {
                      const rawProposals = turn.learnedMemories ?? [];
                      if (rawProposals.length === 0) return null;
                      const visibleProposals = deduplicateMemories(rawProposals, memories).filter(
                        (p) => !dismissedMemoryKeys.has(`${turn.id}:${p.content}`),
                      );
                      if (visibleProposals.length === 0) return null;

                      return (
                        <div className="space-y-2 pt-2 border-t border-surface-2">
                          <p className="inline-flex items-center gap-1.5 text-label font-bold text-primary">
                            <Brain className="w-4 h-4 shrink-0" aria-hidden="true" />
                            Trợ lý đề xuất ghi nhớ cho vườn ({visibleProposals.length}):
                          </p>
                          {visibleProposals.map((proposal, pIdx) => {
                            const memKey = `${turn.id}:${proposal.content}`;
                            const isSaved = savedMemoryKeys.has(memKey);
                            const isEditing = editingMemory?.key === memKey;
                            const scopeLabel = proposal.targetIds?.length
                              ? proposal.targetIds
                                  .map((id) =>
                                    id === LOT_A_ID
                                      ? 'Lô A'
                                      : (trees.find((t) => t.id === id)?.code ?? id),
                                  )
                                  .join(', ')
                              : 'Cả vườn';

                            if (isEditing && editingMemory) {
                              return (
                                <div
                                  key={`${memKey}-${pIdx}`}
                                  className="rounded-sm border border-primary bg-bg p-3 space-y-2.5"
                                >
                                  <TextField
                                    label="Chỉnh sửa nội dung ghi nhớ"
                                    multiline
                                    rows={2}
                                    value={editingMemory.content}
                                    error={editingMemory.error}
                                    onChange={(e) =>
                                      setEditingMemory((cur) =>
                                        cur ? { ...cur, content: e.target.value, error: undefined } : null,
                                      )
                                    }
                                  />
                                  <SelectField
                                    label="Nhóm ghi nhớ"
                                    value={editingMemory.category}
                                    options={MEMORY_CATEGORY_OPTIONS}
                                    onChange={(e) =>
                                      setEditingMemory((cur) =>
                                        cur
                                          ? { ...cur, category: e.target.value as AiMemoryCategory }
                                          : null,
                                      )
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="filled"
                                      leadingIcon={<Check className="w-5 h-5" />}
                                      onClick={() => {
                                        const clean = editingMemory.content.trim();
                                        if (!clean) {
                                          setEditingMemory((cur) =>
                                            cur ? { ...cur, error: 'Nội dung ghi nhớ không được để trống.' } : null,
                                          );
                                          return;
                                        }
                                        if (looksSensitive(clean)) {
                                          setEditingMemory((cur) =>
                                            cur
                                              ? {
                                                  ...cur,
                                                  error: 'Không được ghi nhớ mật khẩu, token hay API key.',
                                                }
                                              : null,
                                          );
                                          return;
                                        }
                                        void onSaveAiMemory({
                                          content: clean,
                                          category: editingMemory.category,
                                          targetIds: editingMemory.targetIds,
                                          confidence: editingMemory.confidence,
                                          source: 'ai',
                                          approved: true,
                                        }).then(() => {
                                          setSavedMemoryKeys((prev) => new Set(prev).add(memKey));
                                          setEditingMemory(null);
                                          triggerHaptic(hapticsEnabled);
                                          onNotify('Đã lưu ghi nhớ cho trợ lý AI.', 'ok');
                                        });
                                      }}
                                    >
                                      Lưu ghi nhớ
                                    </Button>
                                    <Button variant="text" onClick={() => setEditingMemory(null)}>
                                      Hủy
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`${memKey}-${pIdx}`}
                                className="rounded-sm border border-outline bg-bg p-3 space-y-2"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <StatusPill tone="info">
                                    {AI_MEMORY_CATEGORY_LABEL[proposal.category]}
                                  </StatusPill>
                                  <StatusPill tone="neutral">{scopeLabel}</StatusPill>
                                </div>
                                <p className="text-body text-text leading-snug">{proposal.content}</p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant={isSaved ? 'tonal' : 'filled'}
                                    disabled={isSaved}
                                    leadingIcon={<Check className="w-5 h-5" />}
                                    onClick={() => {
                                      void onSaveAiMemory({
                                        ...proposal,
                                        source: 'ai',
                                        approved: true,
                                      })
                                        .then(() => {
                                          setSavedMemoryKeys((prev) => new Set(prev).add(memKey));
                                          triggerHaptic(hapticsEnabled);
                                          onNotify('Đã lưu ghi nhớ cho trợ lý AI.', 'ok');
                                        })
                                        .catch((err) => {
                                          onNotify(
                                            err instanceof Error
                                              ? err.message
                                              : 'Không lưu được ghi nhớ này.',
                                            'danger',
                                          );
                                        });
                                    }}
                                  >
                                    {isSaved ? 'Đã ghi nhớ' : 'Ghi nhớ'}
                                  </Button>
                                  {!isSaved && (
                                    <>
                                      <Button
                                        variant="tonal"
                                        leadingIcon={<Edit3 className="w-5 h-5" />}
                                        onClick={() =>
                                          setEditingMemory({
                                            key: memKey,
                                            content: proposal.content,
                                            category: proposal.category,
                                            targetIds: proposal.targetIds,
                                            confidence: proposal.confidence,
                                          })
                                        }
                                      >
                                        Sửa
                                      </Button>
                                      <Button
                                        variant="text"
                                        onClick={() =>
                                          setDismissedMemoryKeys((prev) => new Set(prev).add(memKey))
                                        }
                                      >
                                        Bỏ qua
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Save AI result to synced orchard log (type: 'ai') */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-2">
                      <Button
                        variant="tonal"
                        disabled={isSavedToLog}
                        leadingIcon={
                          isSavedToLog ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <BookMarked className="w-5 h-5" />
                          )
                        }
                        onClick={() => {
                          const logTarget = targetId || LOT_A_ID;
                          void onSaveAiLog({
                            targetId: logTarget,
                            note: turn.content,
                          }).then(() => {
                            setSavedLogMessageIds((prev) => new Set(prev).add(turn.id));
                            triggerHaptic(hapticsEnabled);
                            onNotify(
                              `Đã lưu ghi chú AI vào nhật ký (${selectedTree?.code ?? 'Lô A'}).`,
                              'ok',
                            );
                          });
                        }}
                      >
                        {isSavedToLog ? 'Đã lưu nhật ký' : 'Lưu vào nhật ký'}
                      </Button>
                    </div>

                    {/* Permanent mandatory disclaimer under EVERY AI answer (SPEC M7 & T06 AC6) */}
                    <Banner tone="warn" icon={<ShieldAlert className="w-5 h-5" />}>
                      {AI_DISCLAIMER}
                    </Banner>
                  </Card>
                );
              })}
            </div>
          )}

          {sending && (
            <Banner tone="info" icon={<AlertTriangle className="w-5 h-5" />}>
              Đang hỏi Gemini và phân tích dữ liệu vườn…
            </Banner>
          )}
        </div>
      </BottomSheet>

      {/* Clipboard Fallback Dialog */}
      <Dialog
        open={Boolean(fallbackPromptText)}
        title="Sao chép Prompt thủ công"
        subtitle="Chọn toàn bộ nội dung bên dưới để dán vào ứng dụng AI"
        onClose={() => setFallbackPromptText(null)}
        footer={
          <Button variant="filled" onClick={() => setFallbackPromptText(null)}>
            Đóng
          </Button>
        }
      >
        <TextField
          label="Nội dung Prompt"
          multiline
          rows={8}
          value={fallbackPromptText ?? ''}
          readOnly
        />
      </Dialog>
    </>
  );
}
