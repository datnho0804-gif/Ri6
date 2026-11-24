import type { ISODate, Season, Tree } from '../types/models';
import { FARM } from './agronomy';
import { formatDateVN } from './date';
import { STAGE_LABEL } from './labels';
import { seasonLabel } from './season';

/** 6 dấu hiệu theo đúng thứ tự (SPEC §3.6). Chỉ số 0 = chồi gốc ghép. */
export const PRUNE_SIGNS = [
  'Chồi gốc ghép',
  'Cành thấp sát đất',
  'Cành vượt',
  'Cành tăm / cành khô trong lòng tán',
  'Cành đan chéo',
  'Tán lệch',
] as const;

export const PRUNE_ANGLES = [
  { kind: 'prune-overview', title: 'Toàn tán 2 hướng', hint: 'Đứng cách mép tán 3–5 m, chụp 2 hướng vuông góc' },
  { kind: 'prune-under', title: 'Ngước vào lòng tán', hint: 'Đứng dưới gốc chụp ngược lên, thấy rõ góc cành cấp 1 và cành tăm' },
  { kind: 'prune-closeup', title: 'Cận cảnh cụm cành', hint: 'Buộc dây màu hoặc chỉ tay vào cụm cành nghi vấn làm mốc' },
] as const;

export const PRUNE_REMINDERS = [
  'Cắt vào ngày nắng ráo.',
  'Cắt sát cổ cành, không để lại cuống.',
  'Vết cắt lớn hơn 2 cm: quét keo liền sẹo hoặc thuốc gốc đồng.',
  'Khử trùng dụng cụ bằng cồn 70% khi chuyển sang cây khác (tránh lây Phytophthora).',
] as const;

export type PruneLevel = 'khong-can' | 'nhe' | 'vua' | 'manh';

export const PRUNE_LEVEL_LABEL: Record<PruneLevel, string> = {
  'khong-can': 'Không cần',
  nhe: 'Nhẹ',
  vua: 'Vừa',
  manh: 'Mạnh',
};

/** Mức cần cắt tỉa theo số dấu hiệu (T03 AC1): 0 · 1–2 · 3–4 · 5–6. */
export function pruneLevel(signs: readonly boolean[]): { count: number; level: PruneLevel; label: string; removeSuckersNow: boolean } {
  if (signs.length !== PRUNE_SIGNS.length) throw new Error(`Cần đúng ${PRUNE_SIGNS.length} dấu hiệu`);
  const count = signs.filter(Boolean).length;
  const level: PruneLevel = count === 0 ? 'khong-can' : count <= 2 ? 'nhe' : count <= 4 ? 'vua' : 'manh';
  return { count, level, label: PRUNE_LEVEL_LABEL[level], removeSuckersNow: signs[0] === true };
}

/** Ghi chú cho nhật ký "Cắt tỉa" khi bấm "Lưu: Cần cắt tỉa" (SPEC M3). */
export function pruneLogNote(signs: readonly boolean[]): string {
  const r = pruneLevel(signs);
  const ticked = PRUNE_SIGNS.filter((_, i) => signs[i]);
  return `Đánh giá cắt tỉa: mức ${r.label} (${r.count}/6)${ticked.length ? ` — ${ticked.join(', ')}` : ''}.${r.removeSuckersNow ? ' Cắt bỏ chồi gốc ghép ngay.' : ''}`;
}

/** Copy Prompt phân tích cắt tỉa (SPEC M3) — kèm hướng dẫn 3 góc ảnh sẽ gửi. */
export function buildPrunePrompt(input: { tree: Tree; signs: readonly boolean[]; season: Season; today: ISODate }): string {
  const { tree: t } = input;
  const r = pruneLevel(input.signs);
  const ticked = PRUNE_SIGNS.filter((_, i) => input.signs[i]);
  return [
    `Tôi trồng sầu riêng ${FARM.variety} tại ${FARM.place} (${FARM.soil}, ${FARM.irrigation}). Hôm nay ${formatDateVN(input.today)}, ${seasonLabel(input.season).toLowerCase()}.`,
    `Cây ${t.label || t.code} (mã ${t.code}), Lô ${t.lot}${t.ageYears ? `, ${t.ageYears} năm tuổi` : ''}, giai đoạn: ${t.stage ? STAGE_LABEL[t.stage] : 'chưa ghi'}.`,
    `Dấu hiệu tôi quan sát: ${ticked.length ? ticked.join(', ') : 'chưa thấy dấu hiệu rõ'} → app đánh giá mức "${r.label}".`,
    `Tôi gửi kèm 3 ảnh: ${PRUNE_ANGLES.map((a, i) => `(${i + 1}) ${a.title.toLowerCase()}`).join('; ')}.`,
    'Hãy trả lời bằng tiếng Việt:',
    '1. Nên cắt những cành nào (mô tả vị trí theo ảnh), cành nào giữ lại.',
    '2. Mức độ cắt phù hợp với tuổi cây và giai đoạn hiện tại; có nên đợi sau thu hoạch không.',
    '3. Thời điểm cắt và cách xử lý vết cắt.',
    '4. Rủi ro nếu cắt quá tay (ảnh hưởng ra hoa, đậu trái).',
  ].join('\n');
}
