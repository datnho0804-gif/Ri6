import type { AiMemory, ISODate, Log, Season, Tree } from '../../types/models';
import type { AgendaItem } from '../agenda/agenda';
import { FARM, IRRIGATION, LIME_GAP_DAYS, PROMPT_RECENT_LOGS, RI6, SOIL_PH } from '../agronomy';
import { describeLog, recentLogs } from '../copyPrompt';
import { diffDays, formatDateVN } from '../date';
import { HEALTH_LABEL, STAGE_LABEL } from '../labels';
import { PROTOCOL_DISCLAIMER, ROTATION_NOTE } from '../protocols';
import { SEASON_ADVICE, seasonLabel } from '../season';
import { BANNED_ACTIVE_INGREDIENTS, describeSupply, SUPPLIES, SUPPLY_LABEL_NOTE, type SupplyItem } from '../supplies';
import { describeMemory, logInsights, selectRelevantMemories } from './memory';

const ph = (v: number) => String(v).replace('.', ',');
const range = (r: readonly [number, number]) => `${r[0]}–${r[1]}`;

/** Câu cảnh báo hiện dưới MỌI câu trả lời AI (SPEC M7). */
export const AI_DISCLAIMER =
  'AI chỉ để tham khảo. Thuốc BVTV: đối chiếu nhãn và Danh mục được phép tại VN; giá chỉ là tham khảo; tuân thủ PHI.';

/**
 * System instruction cho Gemini (SPEC M7, M7.1 [1.2], T06 AC2, T07 AC4).
 * Quy tắc nông học lấy từ `agronomy.ts` (một nguồn). KHÔNG nhận Settings → không thể lộ token/API key.
 *
 * - `memories`: toàn bộ ghi nhớ; hàm tự chọn mục đã duyệt, liên quan (selectRelevantMemories).
 * - `supplies`: danh mục vật tư nạp vào prompt; mặc định `SUPPLIES`; truyền `[]` để bỏ.
 * - `trees`: để đổi id cây → mã khi viết kinh nghiệm rút từ nhật ký.
 */
export function buildSystemPrompt(input: {
  season: Season;
  today: ISODate;
  tree?: Tree;
  trees?: readonly Tree[];
  logs?: readonly Log[];
  agenda?: readonly AgendaItem[];
  memories?: readonly AiMemory[];
  supplies?: readonly SupplyItem[];
}): string {
  const lines: string[] = [
    `Bạn là trợ lý kỹ thuật cho vườn sầu riêng ${FARM.variety} tại ${FARM.place}, ${FARM.region} (${FARM.soil}, tưới bằng ${FARM.irrigation}). Hôm nay ${formatDateVN(input.today)}, ${seasonLabel(input.season).toLowerCase()}.`,
    'Vườn gồm Lô A (cây 1 năm, quản lý theo lô) và Lô B (cây 3–5 năm, theo dõi từng cây, mã SRnn).',
    '',
    'QUY TẮC CỦA VƯỜN (ưu tiên khi mâu thuẫn — hãy chỉ ra chỗ mâu thuẫn):',
    `- pH đất mục tiêu ${ph(SOIL_PH.min)}–${ph(SOIL_PH.max)}. Sau bón vôi/Dolomite: chờ ≥ ${LIME_GAP_DAYS.organic} ngày mới bón hữu cơ/Trichoderma, ≥ ${LIME_GAP_DAYS.nitrogenPhosphate} ngày mới bón urê/lân.`,
    `- Ri6: mắt cua → xổ nhụy ${range(RI6.budToFlower)} ngày; sau xổ nhụy: tưới nhấp ${range(RI6.dripWatering)} ngày đầu, chặn đọt + Canxi-Bo ${RI6.shootControlUntil} ngày đầu, chuyển NPK giàu Kali ngày ${range(RI6.potassium)}, lên cơm ${range(RI6.fleshFilling)}, giảm đạm từ ngày ${RI6.reduceNitrogenFrom}, thu hoạch ${range(RI6.harvest)} ngày.`,
    `- Béc tưới không phun vào cổ rễ/thân. Lô A ${IRRIGATION.lotA.min}–${IRRIGATION.lotA.max} L/cây/lần; Lô B ${IRRIGATION.lotB.min}–${IRRIGATION.lotB.max} L/cây/ngày khi nuôi trái.`,
    `- ${ROTATION_NOTE} ${PROTOCOL_DISCLAIMER}`,
    `- KHÔNG đề xuất hoạt chất đã bị loại khỏi Danh mục: ${BANNED_ACTIVE_INGREDIENTS.join(', ')}.`,
    `- Mùa hiện tại — khuyến cáo tối thiểu: ${SEASON_ADVICE[input.season].recommendations.join(' ')}`,
    '',
    'CÁCH TRẢ LỜI (tiếng Việt, ngắn gọn, dễ làm theo ngoài vườn):',
    '1. Nhận định. 2. Mức tin cậy (thấp/vừa/cao). 3. Cần kiểm tra hoặc chụp thêm gì.',
    '4. Xử lý: canh tác và nước trước, thuốc sau.',
    '5. Khi đề xuất thuốc/phân/vật tư: nêu THƯƠNG HIỆU phổ biến (ưu tiên danh mục vật tư của app nếu có, ghi kèm mã [id]), hoạt chất + nhóm FRAC/IRAC, quy cách đóng gói, giá (ưu tiên giá vườn đã mua; giá thị trường ghi rõ "giá tham khảo" kèm tháng; không biết thì nói chưa rõ giá — KHÔNG đoán giá), cách dùng.',
    '   Liều pha: chỉ nêu khi chắc chắn đúng nhãn đăng ký cho sầu riêng/cây ăn trái và luôn kèm câu "đối chiếu nhãn trước khi pha"; không chắc thì ghi "theo nhãn".',
    '6. Nhắc thời gian cách ly (PHI). 7. Khi nào nên mời cán bộ khuyến nông hoặc kỹ sư.',
    'Không chắc thì nói rõ là không chắc. Chủ động đề xuất việc cụ thể kèm số ngày nên làm (để đưa vào danh sách việc cần làm).',
    'GHI NHỚ: khi chủ vườn cho biết điều đáng nhớ lâu dài (kinh nghiệm của vườn, cây phản ứng với phân/thuốc, thói quen, giá và nơi mua vật tư), đề xuất tối đa 3 mục "learnedMemories" ngắn gọn. Không ghi nhớ điều đã có trong GHI NHỚ CỦA VƯỜN, không ghi nhớ mật khẩu, token, số điện thoại.',
  ];
  const t = input.tree;
  if (t) {
    lines.push('', `CÂY ĐANG HỎI: ${t.label || t.code} (mã ${t.code}), Lô ${t.lot}${t.ageYears ? `, ${t.ageYears} năm tuổi` : ''}${t.location ? `, vị trí ${t.location}` : ''}.`);
    lines.push(`Giai đoạn: ${t.stage ? STAGE_LABEL[t.stage] : 'chưa ghi'}; sức khỏe: ${HEALTH_LABEL[t.health]}${t.needsPruning ? '; cần cắt tỉa' : ''}${t.diseaseWatch ? '; đang theo dõi sâu bệnh' : ''}.`);
    if (t.flowerDate) lines.push(`Xổ nhụy ${formatDateVN(t.flowerDate)} — đang ở ngày ${diffDays(t.flowerDate, input.today)}.`);
    if (t.fruitCount !== undefined) lines.push(`Số trái: ${t.fruitCount}${t.fruitLimit !== undefined ? ` (mức tối đa chủ vườn đặt: ${t.fruitLimit})` : ''}.`);
    const recent = recentLogs(input.logs ?? [], t.id, PROMPT_RECENT_LOGS);
    lines.push(recent.length ? `${recent.length} nhật ký gần nhất (mới → cũ):\n${recent.map(describeLog).join('\n')}` : 'Chưa có nhật ký.');
    const todo = (input.agenda ?? []).filter((a) => a.targetId === t.id).slice(0, 5);
    if (todo.length) lines.push(`Việc đang cần làm của cây:\n${todo.map((a) => `- ${a.title}: ${a.reason}`).join('\n')}`);
  }
  const mems = selectRelevantMemories(input.memories ?? [], { targetId: t?.id });
  if (mems.length) lines.push('', 'GHI NHỚ CỦA VƯỜN (chủ vườn đã duyệt — ưu tiên áp dụng):', ...mems.map(describeMemory));
  const insights = logInsights({ logs: input.logs ?? [], today: input.today, trees: input.trees, targetId: t?.id });
  if (insights.length) lines.push('', 'RÚT RA TỪ NHẬT KÝ:', ...insights.map((x) => `- ${x}`));
  const supplies = input.supplies ?? SUPPLIES;
  if (supplies.length) {
    lines.push('', `DANH MỤC VẬT TƯ CỦA APP (${SUPPLY_LABEL_NOTE}):`, ...supplies.map((s) => describeSupply(s, input.logs ?? [])));
  }
  return lines.join('\n');
}

/** Copy Prompt khi offline / chưa có key: dán vào bất kỳ app AI nào (SPEC M7). */
export function buildCopyPromptFallback(systemPrompt: string, question: string): string {
  return `${systemPrompt}\n\nCÂU HỎI CỦA TÔI:\n${question.trim()}`;
}
