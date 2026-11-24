import type { ISODate, Log, Season, Tree } from '../types/models';
import { FARM, PROMPT_RECENT_LOGS, RI6, SOIL_PH } from './agronomy';
import { diffDays, formatDateVN } from './date';
import { FERT_KIND_LABEL, HEALTH_LABEL, LOG_TYPE_LABEL, STAGE_LABEL } from './labels';
import { seasonLabel } from './season';

/** 10 nhật ký gần nhất của đối tượng (mới → cũ), bỏ mục đã xóa. */
export function recentLogs(logs: readonly Log[], targetId: string, limit = PROMPT_RECENT_LOGS): Log[] {
  return logs
    .filter((l) => l.targetId === targetId && !l.deletedAt)
    .sort((a, b) => (a.date === b.date ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export function describeLog(l: Log): string {
  const parts = [formatDateVN(l.date), LOG_TYPE_LABEL[l.type]];
  if (l.fertilizerKind) parts.push(FERT_KIND_LABEL[l.fertilizerKind]);
  if (l.activeIngredient) parts.push(l.activeIngredient);
  if (l.phiDays !== undefined) parts.push(`PHI ${l.phiDays} ngày`);
  if (l.soilPh !== undefined) parts.push(`pH ${String(l.soilPh).replace('.', ',')}`);
  return `- ${parts.join(' · ')}${l.note ? ` — ${l.note}` : ''}`;
}

/**
 * Nội dung "Copy Prompt gửi AI" cho một cây (SPEC M2).
 * Không chứa token/API key (chỉ nhận dữ liệu cây + nhật ký).
 */
export function buildTreeCopyPrompt(input: {
  tree: Tree;
  logs: readonly Log[];
  lastWeekly?: ISODate | null;
  season: Season;
  today: ISODate;
}): string {
  const { tree: t, today } = input;
  const flags = [t.needsPruning && 'cần cắt tỉa', t.diseaseWatch && 'đang theo dõi sâu bệnh'].filter(Boolean);
  const lines = [
    `Tôi trồng sầu riêng ${FARM.variety} tại ${FARM.place} (${FARM.soil}, ${FARM.irrigation}, khí hậu ${FARM.region}). Hôm nay ${formatDateVN(today)}, ${seasonLabel(input.season).toLowerCase()}.`,
    `Cây ${t.label || t.code} (mã ${t.code}) — Lô ${t.lot}${t.ageYears ? `, ${t.ageYears} năm tuổi` : ''}${t.location ? `, vị trí: ${t.location}` : ''}.`,
    `Giai đoạn: ${t.stage ? STAGE_LABEL[t.stage] : 'chưa ghi'}; sức khỏe: ${HEALTH_LABEL[t.health]}${flags.length ? `; ${flags.join(', ')}` : ''}.`,
  ];
  if (t.flowerDate) lines.push(`Xổ nhụy ngày ${formatDateVN(t.flowerDate)} (đang ở ngày ${diffDays(t.flowerDate, today)}; Ri6 thu hoạch ${RI6.harvest[0]}–${RI6.harvest[1]} ngày sau xổ nhụy).`);
  else if (t.budDate) lines.push(`Ra mắt cua ngày ${formatDateVN(t.budDate)}.`);
  if (t.fruitCount !== undefined) lines.push(`Số trái đang mang: ${t.fruitCount}${t.fruitLimit !== undefined ? ` (mức tối đa tôi đặt: ${t.fruitLimit})` : ''}.`);
  lines.push(`Ảnh tuần gần nhất: ${input.lastWeekly ? formatDateVN(input.lastWeekly) : 'chưa có'}. Ngưỡng pH đất mục tiêu ${String(SOIL_PH.min).replace('.', ',')}–${String(SOIL_PH.max).replace('.', ',')}.`);
  const recent = recentLogs(input.logs, t.id);
  lines.push(recent.length ? `${recent.length} nhật ký gần nhất:\n${recent.map(describeLog).join('\n')}` : 'Chưa có nhật ký.');
  lines.push(
    'Hãy trả lời bằng tiếng Việt, theo thứ tự:',
    '1. Chẩn đoán/nhận định tình trạng cây.',
    '2. Mức tin cậy (thấp/vừa/cao) và vì sao.',
    '3. Cần kiểm tra hoặc chụp thêm gì.',
    '4. Việc nên làm trong 7 ngày tới (canh tác & nước trước, thuốc sau).',
    '5. Nếu cần thuốc/phân/vật tư: nêu thương hiệu phổ biến tại Việt Nam, hoạt chất + nhóm FRAC/IRAC để luân phiên, quy cách đóng gói, giá tham khảo (ghi rõ tháng; không biết thì nói chưa rõ giá), cách dùng; liều pha đối chiếu nhãn đăng ký. Chỉ dùng thuốc có trong Danh mục thuốc BVTV được phép tại Việt Nam.',
    '6. Thời gian cách ly (PHI) cần lưu ý trước thu hoạch.',
  );
  return lines.join('\n');
}
