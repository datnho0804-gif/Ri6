import { Brain, Check, Edit3, Info, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LOT_A_ID } from '../../db/seed';
import {
  AI_MEMORY_CATEGORIES,
  AI_MEMORY_CATEGORY_LABEL,
  isActiveMemory,
  logInsights,
  looksSensitive,
  type MemoryProposal,
} from '../../lib/ai/memory';
import { todayVN } from '../../lib/date';
import { triggerHaptic } from '../../lib/haptics';
import type { AiMemory, AiMemoryCategory, Log, Tree } from '../../types/models';
import {
  Banner,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  SelectField,
  StatusPill,
  TextField,
} from '../ui';

const CATEGORY_OPTIONS = AI_MEMORY_CATEGORIES.map((cat) => ({
  value: cat,
  label: AI_MEMORY_CATEGORY_LABEL[cat],
}));

export interface AiMemoryManagerProps {
  memories: AiMemory[];
  trees: Tree[];
  logs: Log[];
  hapticsEnabled: boolean;
  onAddMemory: (
    proposal: MemoryProposal & { source: 'manual'; approved: true },
  ) => Promise<AiMemory>;
  onEditMemory: (
    memory: AiMemory,
    patch: Partial<Pick<AiMemory, 'content' | 'category' | 'targetIds'>>,
  ) => Promise<AiMemory>;
  onDeleteMemory: (memory: AiMemory) => Promise<void>;
  onNotify: (message: string, tone?: 'ok' | 'info' | 'warn' | 'danger') => void;
}

/**
 * M7.1 AI Self-Learning Memory Manager inside SettingsScreen (SPEC M7.1 & T07 AC3):
 * - Explains self-learning = garden memory & learned prices (no model retraining)
 * - Lists active approved memories grouped by category
 * - Manual add, edit, and soft-delete (with Snackbar Undo handled by parent)
 * - Rejects tokens/API keys/passwords via `looksSensitive`
 * - Shows auto-derived `logInsights` (rotation alerts & learned purchase prices)
 */
export function AiMemoryManager({
  memories,
  trees,
  logs,
  hapticsEnabled,
  onAddMemory,
  onEditMemory,
  onDeleteMemory,
  onNotify,
}: AiMemoryManagerProps) {
  const today = todayVN();

  // Manual add form
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AiMemoryCategory>('kinh-nghiem');
  const [scope, setScope] = useState('');
  const [formError, setFormError] = useState<string | undefined>();
  const [savingNew, setSavingNew] = useState(false);

  // Edit dialog state
  const [editing, setEditing] = useState<{
    memory: AiMemory;
    content: string;
    category: AiMemoryCategory;
    scope: string;
    error?: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const scopeOptions = useMemo(
    () => [
      { value: '', label: 'Áp dụng cho cả vườn' },
      { value: LOT_A_ID, label: 'Riêng Lô A (cây kiến thiết)' },
      ...trees.map((t) => ({
        value: t.id,
        label: t.location ? `Riêng cây ${t.code} · ${t.location}` : `Riêng cây ${t.code}`,
      })),
    ],
    [trees],
  );

  const activeMemories = useMemo(() => memories.filter(isActiveMemory), [memories]);

  const groupedMemories = useMemo(() => {
    const groups: Array<{ category: AiMemoryCategory; items: AiMemory[] }> = [];
    for (const cat of AI_MEMORY_CATEGORIES) {
      const items = activeMemories.filter((m) => m.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    return groups;
  }, [activeMemories]);

  const insights = useMemo(
    () => logInsights({ logs, today, trees }),
    [logs, today, trees],
  );

  const labelTarget = (id: string) =>
    id === LOT_A_ID ? 'Lô A' : (trees.find((t) => t.id === id)?.code ?? id);

  const handleAdd = async () => {
    const clean = content.trim();
    if (!clean) {
      setFormError('Hãy nhập nội dung cần trợ lý AI ghi nhớ.');
      return;
    }
    if (looksSensitive(clean)) {
      setFormError('Không được ghi nhớ mật khẩu, token hay API key.');
      return;
    }
    setFormError(undefined);
    setSavingNew(true);
    try {
      await onAddMemory({
        content: clean,
        category,
        ...(scope ? { targetIds: [scope] } : {}),
        source: 'manual',
        approved: true,
      });
      setContent('');
      setScope('');
      triggerHaptic(hapticsEnabled);
      onNotify('Đã lưu ghi nhớ mới cho trợ lý AI.', 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không lưu được ghi nhớ.';
      setFormError(msg);
      onNotify(msg, 'danger');
    } finally {
      setSavingNew(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const clean = editing.content.trim();
    if (!clean) {
      setEditing((cur) => (cur ? { ...cur, error: 'Nội dung ghi nhớ không được để trống.' } : null));
      return;
    }
    if (looksSensitive(clean)) {
      setEditing((cur) =>
        cur ? { ...cur, error: 'Không được ghi nhớ mật khẩu, token hay API key.' } : null,
      );
      return;
    }
    setSavingEdit(true);
    try {
      await onEditMemory(editing.memory, {
        content: clean,
        category: editing.category,
        targetIds: editing.scope ? [editing.scope] : [],
      });
      setEditing(null);
      triggerHaptic(hapticsEnabled);
      onNotify('Đã cập nhật ghi nhớ trợ lý AI.', 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không cập nhật được ghi nhớ.';
      setEditing((cur) => (cur ? { ...cur, error: msg } : null));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section aria-labelledby="sec-ai-memory-heading">
      <div className="flex items-center justify-between gap-2 px-0.5 mb-2 flex-wrap">
        <h2 id="sec-ai-memory-heading" className="text-title font-bold text-text">
          Ghi nhớ của trợ lý AI
        </h2>
        <StatusPill tone={activeMemories.length > 0 ? 'ok' : 'neutral'} icon={<Brain className="w-4 h-4" />}>
          {activeMemories.length} ghi nhớ
        </StatusPill>
      </div>

      <div className="space-y-3">
        <Banner tone="info" icon={<Info className="w-5 h-5" />} title="Cơ chế tự học của trợ lý AI">
          Tự học = <strong>ghi nhớ kinh nghiệm &amp; giá mua thật của vườn</strong> để nạp lại vào
          ngữ cảnh các lần hỏi sau, <strong>không huấn luyện lại model AI</strong>. Mục đã duyệt sẽ
          được đồng bộ cùng sổ vườn — tuyệt đối không lưu mật khẩu, token hay API key.
        </Banner>

        {/* Manual add memory form */}
        <Card padding="md" className="space-y-3">
          <h3 className="text-body font-bold text-text">Thêm ghi nhớ mới</h3>
          <TextField
            label="Nội dung ghi nhớ cho trợ lý AI"
            multiline
            rows={2}
            placeholder="Ví dụ: Góc vườn gần mương giữ ẩm lâu, mùa mưa tưới giảm nửa lượng"
            value={content}
            error={formError}
            helperText="Tối đa 240 ký tự. App tự chặn chuỗi trông như token, API key hoặc mật khẩu."
            onChange={(e) => {
              setContent(e.target.value);
              setFormError(undefined);
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <SelectField
              label="Nhóm ghi nhớ"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(e) => setCategory(e.target.value as AiMemoryCategory)}
            />
            <SelectField
              label="Phạm vi áp dụng"
              value={scope}
              options={scopeOptions}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>
          <Button
            variant="filled"
            size="lg"
            loading={savingNew}
            leadingIcon={<Plus className="w-5 h-5" />}
            onClick={() => {
              void handleAdd();
            }}
          >
            Thêm ghi nhớ
          </Button>
        </Card>

        {/* Active approved memories grouped by category */}
        {groupedMemories.length === 0 ? (
          <Card padding="md">
            <EmptyState
              illustration="durian"
              title="Chưa có ghi nhớ nào được lưu"
              description="Khi hỏi trợ lý AI, bạn có thể bấm 'Ghi nhớ' dưới các đề xuất, hoặc tự thêm kinh nghiệm vườn ở biểu mẫu trên."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {groupedMemories.map((grp) => (
              <Card key={grp.category} padding="none">
                <div className="px-4 py-2.5 border-b border-surface-2 bg-surface-2/40 flex items-center justify-between gap-2">
                  <h3 className="text-label font-bold text-primary">
                    {AI_MEMORY_CATEGORY_LABEL[grp.category]}
                  </h3>
                  <span className="text-caption text-text-3 tabular-nums">{grp.items.length}</span>
                </div>
                {grp.items.map((mem, idx) => (
                  <div
                    key={mem.id}
                    className={[
                      'px-4 py-3 flex items-start gap-2.5',
                      idx > 0 ? 'border-t border-surface-2' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-body text-text leading-snug">{mem.content}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusPill tone="neutral">
                          {mem.targetIds?.length
                            ? mem.targetIds.map(labelTarget).join(', ')
                            : 'Cả vườn'}
                        </StatusPill>
                        <StatusPill tone={mem.source === 'ai' ? 'info' : 'ok'}>
                          {mem.source === 'ai' ? 'AI đề xuất' : 'Chủ vườn thêm'}
                        </StatusPill>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      <IconButton
                        label={`Sửa ghi nhớ ${mem.content.slice(0, 30)}`}
                        onClick={() =>
                          setEditing({
                            memory: mem,
                            content: mem.content,
                            category: mem.category,
                            scope: mem.targetIds?.[0] ?? '',
                          })
                        }
                      >
                        <Edit3 className="w-5 h-5 text-text-2" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Xóa ghi nhớ ${mem.content.slice(0, 30)}`}
                        onClick={() => {
                          void onDeleteMemory(mem);
                        }}
                      >
                        <Trash2 className="w-5 h-5 text-danger" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        )}

        {/* Auto-derived insights from logs (learned prices & rotation alerts) */}
        {insights.length > 0 && (
          <Card padding="md" className="space-y-2">
            <h3 className="inline-flex items-center gap-1.5 text-body font-bold text-text">
              <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              Tự động rút ra từ nhật ký ({insights.length})
            </h3>
            <p className="text-caption text-text-3">
              Hệ thống tự đọc từ lịch sử phun thuốc &amp; giá mua gần nhất và tự nạp cho trợ lý AI.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-body text-text-2 leading-relaxed">
              {insights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Edit Memory Dialog */}
      <Dialog
        open={Boolean(editing)}
        title="Sửa ghi nhớ trợ lý AI"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              size="lg"
              loading={savingEdit}
              leadingIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                void handleSaveEdit();
              }}
            >
              Lưu thay đổi
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <TextField
              label="Nội dung ghi nhớ"
              multiline
              rows={3}
              value={editing.content}
              error={editing.error}
              onChange={(e) =>
                setEditing((cur) =>
                  cur ? { ...cur, content: e.target.value, error: undefined } : null,
                )
              }
            />
            <SelectField
              label="Nhóm ghi nhớ"
              value={editing.category}
              options={CATEGORY_OPTIONS}
              onChange={(e) =>
                setEditing((cur) =>
                  cur ? { ...cur, category: e.target.value as AiMemoryCategory } : null,
                )
              }
            />
            <SelectField
              label="Phạm vi áp dụng"
              value={editing.scope}
              options={scopeOptions}
              onChange={(e) =>
                setEditing((cur) => (cur ? { ...cur, scope: e.target.value } : null))
              }
            />
          </div>
        )}
      </Dialog>
    </section>
  );
}
