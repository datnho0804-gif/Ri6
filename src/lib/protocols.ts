import type { Season } from '../types/models';
import { LIME_GAP_DAYS, RECHECK_AFTER_DAYS, RI6 } from './agronomy';
import { normalizeVi } from './text';

/**
 * 8 phác đồ sâu bệnh (SPEC §3.5 + [1.1]) — mỗi phác đồ đủ 5 bước.
 * Thẻ phác đồ nêu HOẠT CHẤT + nhóm FRAC/IRAC; thương hiệu, quy cách, giá, cách dùng nằm ở
 * danh mục vật tư `src/lib/supplies.ts` (`getSuppliesForProtocol`) — SPEC 1.2.
 */
export const PROTOCOL_DISCLAIMER =
  'Chỉ dùng thuốc có trong Danh mục thuốc BVTV được phép sử dụng tại Việt Nam hiện hành; liều pha và PHI đối chiếu nhãn sản phẩm. Giá trong mục Vật tư chỉ để tham khảo.';

export const ROTATION_NOTE = 'Luân phiên theo NHÓM cơ chế FRAC/IRAC — đổi tên thương mại mà cùng nhóm thì không có tác dụng.';

export type StepKey = 'nhan-dinh' | 'kiem-tra' | 'canh-tac' | 'xu-ly' | 'theo-doi';

export interface ProtocolGroup {
  /** Nhãn mục con (phác đồ gộp 2 đối tượng), bỏ trống nếu chỉ 1 nhóm. */
  label?: string;
  items: string[];
}
export interface ProtocolStep {
  key: StepKey;
  title: string;
  groups: ProtocolGroup[];
}
export interface ActiveIngredient {
  name: string;
  /** Ví dụ "FRAC 4", "IRAC 6". */
  group: string;
  target?: string;
  note?: string;
}
export interface Protocol {
  id: string;
  name: string;
  agents: string;
  kind: 'benh' | 'sau' | 'sinh-ly';
  /** Mùa hay bùng phát; 'ca-nam' nếu không rõ mùa. */
  season: Season | 'ca-nam';
  steps: [ProtocolStep, ProtocolStep, ProtocolStep, ProtocolStep, ProtocolStep];
  actives: ActiveIngredient[];
}

const g = (...items: string[]): ProtocolGroup[] => [{ items }];
const recheck = `Kiểm tra lại sau ${RECHECK_AFTER_DAYS[0]} và ${RECHECK_AFTER_DAYS[1]} ngày`;
const logPhi = 'Ghi nhật ký "Phun thuốc" kèm hoạt chất + PHI để app cảnh báo trước thu hoạch.';

function steps(
  nhanDinh: ProtocolGroup[],
  kiemTra: ProtocolGroup[],
  canhTac: ProtocolGroup[],
  xuLy: ProtocolGroup[],
  theoDoi: ProtocolGroup[],
  xuLyTitle = 'Hoạt chất luân phiên',
): Protocol['steps'] {
  return [
    { key: 'nhan-dinh', title: 'Nhận định', groups: nhanDinh },
    { key: 'kiem-tra', title: 'Kiểm tra tại vườn', groups: kiemTra },
    { key: 'canh-tac', title: 'Canh tác & béc tưới', groups: canhTac },
    { key: 'xu-ly', title: xuLyTitle, groups: xuLy },
    { key: 'theo-doi', title: 'Theo dõi 7–14 ngày & PHI', groups: theoDoi },
  ];
}

export const PROTOCOLS: readonly Protocol[] = [
  {
    id: 'phytophthora',
    name: 'Xì mủ, thối rễ',
    agents: 'Nấm Phytophthora palmivora',
    kind: 'benh',
    season: 'mua',
    actives: [
      { name: 'Metalaxyl-M', group: 'FRAC 4' },
      { name: 'Fosetyl-aluminium', group: 'FRAC P07' },
      { name: 'Phosphonate (axit photphorơ)', group: 'FRAC P07' },
      { name: 'Dimethomorph', group: 'FRAC 40' },
      { name: 'Trichoderma (sinh học)', group: 'Sinh học', note: 'Bổ sung cùng phân hữu cơ sau khi đã xử lý' },
    ],
    steps: steps(
      g('Vỏ thân hoặc cổ rễ có vết ướt sẫm, chảy nhựa nâu đỏ, mùi chua.', 'Lá vàng, rũ theo từng cành; rễ tơ thối nâu, tuột vỏ.', 'Bùng phát mùa mưa, đất úng, béc phun vào thân, có vết thương ở gốc.'),
      g('Cạo nhẹ vỏ chỗ thâm: mô bên trong nâu đỏ là đang bệnh; đánh dấu vùng lan rộng.', 'Kiểm tra rễ tơ quanh rìa tán và rãnh thoát nước có đọng nước không.', 'Xem béc có phun vào cổ rễ không; đo pH đất (mục tiêu 5,5–6,5).'),
      g(
        'Dời béc ra xa thân (Lô A 40–50 cm, Lô B 1–1,5 m); giảm tưới khi đất còn ướt.',
        'Khơi rãnh thoát nước; tỉa cành sát đất cho thông thoáng gốc.',
        'Cạo sạch vết bệnh tới mô lành, gom vỏ bệnh ra khỏi vườn; khử trùng dụng cụ cồn 70%.',
        `Sau khi ổn định: bón hữu cơ + Trichoderma, cách lần bón vôi ít nhất ${LIME_GAP_DAYS.organic} ngày.`,
      ),
      g('Quét lên vết đã cạo, tưới gốc hoặc tiêm thân theo nhãn: Metalaxyl-M (FRAC 4); Fosetyl-aluminium hoặc Phosphonate (FRAC P07); Dimethomorph (FRAC 40).', 'Mỗi lần xử lý đổi sang nhóm FRAC khác.'),
      g(`${recheck}: vết bệnh khô mặt, viền không lan rộng; có rễ tơ mới.`, logPhi),
    ),
  },
  {
    id: 'rhizoctonia',
    name: 'Cháy lá',
    agents: 'Nấm Rhizoctonia solani',
    kind: 'benh',
    season: 'mua',
    actives: [
      { name: 'Validamycin', group: 'FRAC 26' },
      { name: 'Hexaconazole', group: 'FRAC 3' },
      { name: 'Azoxystrobin', group: 'FRAC 11' },
    ],
    steps: steps(
      g('Vết cháy nâu xám loang từ chóp, mép lá; lá cháy dính chùm bởi tơ nấm.', 'Lan nhanh khi ẩm độ cao, tán rậm, thiếu nắng.'),
      g('Lật lá trong lòng tán tìm tơ nấm trắng nâu; ước lượng phần trăm tán bị.', 'Kiểm tra lá non trên cơi đọt mới.'),
      g('Tỉa thông thoáng lòng tán; cắt bỏ cành lá bệnh, gom tiêu hủy lá rụng.', 'Không để béc phun lên tán; không bón dư đạm.'),
      g('Phun luân phiên: Validamycin (FRAC 26), Hexaconazole (FRAC 3), Azoxystrobin (FRAC 11).'),
      g(`${recheck}: vết bệnh khô, không lan sang lá mới.`, logPhi),
    ),
  },
  {
    id: 'nam-hong',
    name: 'Nấm hồng',
    agents: 'Nấm Erythricium salmonicolor',
    kind: 'benh',
    season: 'mua',
    actives: [
      { name: 'Đồng hydroxide / Đồng oxychloride', group: 'FRAC M01', note: 'Tránh phun khi đang xổ nhụy' },
      { name: 'Validamycin', group: 'FRAC 26' },
      { name: 'Hexaconazole', group: 'FRAC 3' },
    ],
    steps: steps(
      g('Lớp tơ nấm trắng hồng hoặc cam phủ trên cành cấp 1–2 trong lòng tán.', 'Vỏ nứt, cành phía trên héo khô; hay gặp mùa mưa, tán rậm.'),
      g('Soi các chạc cành và mặt dưới cành trong tán.', 'Xác định cành đã bị bao kín quanh chu vi chưa (cành đó khó cứu).'),
      g('Cành bị nặng: cắt lùi vào phần gỗ lành và tiêu hủy; cành nhẹ: cạo sạch vết nấm.', 'Tỉa thông thoáng tán; khử trùng dụng cụ cồn 70% giữa các cây.'),
      g('Quét hoặc phun lên vết đã cạo: thuốc gốc đồng (FRAC M01); luân phiên Validamycin (FRAC 26), Hexaconazole (FRAC 3).', 'Tránh gốc đồng khi cây đang xổ nhụy.'),
      g(`${recheck}: vết nấm khô, không lan sang cành khác.`, logPhi),
    ),
  },
  {
    id: 'ray',
    name: 'Rầy hại đọt non',
    agents: 'Rầy xanh (Amrasca sp.) và rầy phấn (Allocaridara malayensis)',
    kind: 'sau',
    season: 'kho',
    actives: [
      { name: 'Thiamethoxam / Imidacloprid / Dinotefuran', group: 'IRAC 4A', note: 'KHÔNG phun khi hoa nở (độc với ong)' },
      { name: 'Buprofezin', group: 'IRAC 16', note: 'Diệt rầy non' },
      { name: 'Spirotetramat', group: 'IRAC 23' },
      { name: 'Dầu khoáng', group: 'Vật lý' },
    ],
    steps: steps(
      g('Lá non xoăn nhỏ, cháy mép, chấm vàng; rầy nhỏ màu xanh nhảy nhanh khi chạm vào.', 'Rầy phấn tiết lớp sáp trắng trên đọt; nặng khi ra cơi đọt, mùa khô.'),
      g('Sáng sớm soi 10 đọt non ngẫu nhiên mỗi lô, ghi số đọt có rầy.', 'Xem lá non mới mở có xoăn hoặc cháy mép không.'),
      g('Điều khiển cơi đọt ra đồng loạt theo lô để phun tập trung.', 'Không bón dư đạm làm đọt kéo dài; làm sạch cỏ dại quanh gốc.'),
      g('Phun khi đọt vừa nhú mũi giáo, lặp lại khi lá mở: luân phiên IRAC 4A (Thiamethoxam, Imidacloprid, Dinotefuran), IRAC 16 (Buprofezin), IRAC 23 (Spirotetramat), dầu khoáng.', 'Không dùng nhóm 4A khi cây đang ra hoa.'),
      g('Kiểm tra lại sau 5–7 ngày khi lá non mở đều: lá phẳng, không xoăn mép.', logPhi),
    ),
  },
  {
    id: 'nhen-do',
    name: 'Nhện đỏ',
    agents: 'Nhện đỏ hại lá (Tetranychidae)',
    kind: 'sau',
    season: 'kho',
    actives: [
      { name: 'Abamectin', group: 'IRAC 6' },
      { name: 'Hexythiazox', group: 'IRAC 10A', note: 'Diệt trứng và nhện non' },
      { name: 'Fenpyroximate', group: 'IRAC 21A' },
      { name: 'Propargite', group: 'IRAC 12C' },
      { name: 'Dầu khoáng', group: 'Vật lý', note: 'Không phun lúc nắng gắt hoặc đang xổ nhụy' },
    ],
    steps: steps(
      g('Lá già bạc màu, xám như phủ bụi, chấm li ti mặt trên; rụng lá sớm.', 'Bùng phát mạnh mùa khô nắng nóng (T11–T4).'),
      g('Lật mặt dưới lá già hoặc lá bánh tẻ, soi kính lúp hoặc miết lên giấy trắng thấy vệt đỏ.', 'Đếm số lá có nhện trên 20 lá mỗi cây để so sánh lần sau.'),
      g('Giữ ẩm đất bằng béc và tủ gốc; phun rửa tán bằng nước sạch sáng sớm khi chưa ra bông.', 'Hạn chế thuốc trừ sâu phổ rộng để giữ thiên địch.'),
      g('Phun ướt kỹ mặt dưới lá, luân phiên: Abamectin (IRAC 6), Hexythiazox (IRAC 10A), Fenpyroximate (IRAC 21A), Propargite (IRAC 12C), dầu khoáng.'),
      g('Kiểm tra lại sau 7 ngày (trứng mới nở); nếu còn thì phun nhắc lần 2 bằng nhóm khác.', logPhi),
    ),
  },
  {
    id: 'rung-trai-chay-mui',
    name: 'Rụng trái non & cháy múi Ri6',
    agents: 'Rối loạn sinh lý — dinh dưỡng, nước, cạnh tranh đọt non',
    kind: 'sinh-ly',
    season: 'ca-nam',
    actives: [],
    steps: steps(
      g(`Trái non rụng nhiều trong 30–60 ngày sau xổ nhụy.`, 'Bổ trái thấy múi sượng hoặc cháy nâu; liên quan ra đọt non, thiếu Canxi-Bo, sốc nước, dư đạm giai đoạn cuối, mưa trái mùa.'),
      g('Ngọn cây có đọt non đang nhú không; độ ẩm đất quanh rìa tán.', 'Xem nhật ký phân 3 tuần gần nhất; so số trái với mức tối đa đã đặt cho cây.'),
      g(
        `Chặn đọt non chặt trong ${RI6.shootControlUntil} ngày đầu sau xổ nhụy.`,
        `Tưới nhấp ${RI6.dripWatering[0]}–${RI6.dripWatering[1]} ngày đầu (1 ngày tưới – 1 ngày nghỉ, tùy ẩm đất); giữ ẩm ổn định 3–4 tuần cuối; thoát nước khi mưa.`,
        'Tỉa bớt trái dị dạng, trái quá dày.',
      ),
      g(
        'Bổ sung Canxi-Bo sớm sau xổ nhụy.',
        `Chuyển NPK giàu Kali (ví dụ 12-11-18) từ ngày ${RI6.potassium[0]}–${RI6.potassium[1]}; giảm đạm từ ngày ${RI6.reduceNitrogenFrom}.`,
        'Không bón đạm cao giai đoạn cuối.',
      ),
      g('Mỗi 7 ngày ghi tỷ lệ đậu trái trong 30 ngày đầu.', `Kiểm tra độ chín ở mốc ${RI6.harvest[0]}–${RI6.harvest[1]} ngày sau xổ nhụy.`),
      'Dinh dưỡng & nước',
    ),
  },
  {
    id: 'duc-trai-rep-sap',
    name: 'Sâu đục trái & Rệp sáp',
    agents: 'Sâu đục trái (Conogethes punctiferalis) và rệp sáp (Planococcus spp.) — giai đoạn nuôi trái',
    kind: 'sau',
    season: 'ca-nam',
    actives: [
      { name: 'Emamectin benzoate', group: 'IRAC 6', target: 'Sâu đục trái' },
      { name: 'Chlorantraniliprole', group: 'IRAC 28', target: 'Sâu đục trái' },
      { name: 'Spinetoram', group: 'IRAC 5', target: 'Sâu đục trái' },
      { name: 'Indoxacarb', group: 'IRAC 22A', target: 'Sâu đục trái' },
      { name: 'Bacillus thuringiensis', group: 'IRAC 11A', target: 'Sâu đục trái' },
      { name: 'Spirotetramat', group: 'IRAC 23', target: 'Rệp sáp' },
      { name: 'Buprofezin', group: 'IRAC 16', target: 'Rệp sáp' },
      { name: 'Thiamethoxam / Dinotefuran', group: 'IRAC 4A', target: 'Rệp sáp', note: 'Chỉ dùng ngoài thời gian hoa nở' },
      { name: 'Dầu khoáng', group: 'Vật lý', target: 'Rệp sáp' },
    ],
    steps: steps(
      [
        { label: 'Sâu đục trái', items: ['Lỗ đục trên vỏ trái có phân sâu đùn ra, chảy mủ; hay ở chỗ hai trái chạm nhau.', 'Trái thối, rụng sớm.'] },
        { label: 'Rệp sáp', items: ['Cụm rệp phủ sáp trắng ở cuống và kẽ gai trái; có kiến bu, muội đen.'] },
      ],
      [
        { label: 'Sâu đục trái', items: ['Kiểm tra chỗ trái chạm nhau và cuống trái, tìm phân sâu mới.'] },
        { label: 'Rệp sáp', items: ['Kiểm tra cuống, kẽ gai trái và đường kiến bò lên cây.'] },
      ],
      [
        { label: 'Sâu đục trái', items: ['Tỉa bớt trái chạm nhau; bao trái.', 'Thu gom và tiêu hủy trái rụng, trái bị đục; bẫy đèn bắt bướm.'] },
        { label: 'Rệp sáp', items: ['Chặn kiến (quấn băng keo hoặc khoanh gốc) vì rệp sáp sống cộng sinh với kiến.', 'Cắt bỏ cành rệp nặng; phun rửa bằng nước.'] },
      ],
      [
        { label: 'Sâu đục trái', items: ['Luân phiên: Emamectin benzoate (IRAC 6), Chlorantraniliprole (IRAC 28), Spinetoram (IRAC 5), Indoxacarb (IRAC 22A), Bacillus thuringiensis (IRAC 11A).'] },
        { label: 'Rệp sáp', items: ['Luân phiên: Spirotetramat (IRAC 23), Buprofezin (IRAC 16), dầu khoáng; nhóm 4A chỉ dùng ngoài thời gian hoa nở.'] },
        { items: ['Gần thu hoạch: ưu tiên hoạt chất có PHI ngắn và đối chiếu cảnh báo PHI của app.'] },
      ],
      g('Kiểm tra lại sau 7 ngày: còn lỗ đục mới hoặc rệp còn sống không.', logPhi),
    ),
  },
  {
    id: 'mot-xen-toc',
    name: 'Mọt đục cành / Xén tóc đục thân',
    agents: 'Xén tóc (Batocera spp.) và mọt đục cành (Xyleborus spp.) — hay gặp cây 3–5 năm',
    kind: 'sau',
    season: 'ca-nam',
    actives: [
      { name: 'Emamectin benzoate', group: 'IRAC 6', target: 'Xén tóc', note: 'Bơm vào lỗ đục rồi bịt lại' },
      { name: 'Chlorantraniliprole', group: 'IRAC 28', target: 'Xén tóc', note: 'Bơm vào lỗ đục rồi bịt lại' },
      { name: 'Alpha-cypermethrin', group: 'IRAC 3A', target: 'Xén tóc', note: 'Phun thân khi thành trùng vũ hóa' },
      { name: 'Thuốc gốc đồng', group: 'FRAC M01', target: 'Mọt đục cành', note: 'Quét vết cắt' },
    ],
    steps: steps(
      [
        { label: 'Xén tóc', items: ['Lỗ đục trên thân hoặc cành lớn có mạt gỗ dạng sợi đùn ra, chảy nhựa; cành héo, dễ gãy.'] },
        { label: 'Mọt đục cành', items: ['Nhiều lỗ nhỏ như đầu kim trên cành, có bột gỗ mịn; cành khô dần.', 'Mọt thường tấn công cây suy yếu và mang theo nấm Fusarium.'] },
      ],
      g('Tìm lỗ đục mới (mạt còn tươi), lần theo đường hầm.', 'Kiểm tra cây suy yếu và vết thương cơ giới trên thân, cành.'),
      [
        { items: ['Giữ cây khỏe (dinh dưỡng, nước, thoát nước), hạn chế gây vết thương.'] },
        { label: 'Xén tóc', items: ['Bắt thành trùng vào mùa vũ hóa; dùng móc kẽm lôi sâu non ra khỏi lỗ.'] },
        { label: 'Mọt đục cành', items: ['Cắt bỏ và tiêu hủy cành bị nặng; quét thuốc gốc đồng lên vết cắt.'] },
      ],
      [
        { label: 'Xén tóc', items: ['Bơm vào lỗ đục rồi bịt bằng đất sét hoặc mát tít: Emamectin benzoate (IRAC 6) hoặc Chlorantraniliprole (IRAC 28).', 'Khi thành trùng vũ hóa: phun thân bằng Alpha-cypermethrin (IRAC 3A).'] },
        { label: 'Mọt đục cành', items: ['Quét thuốc gốc đồng (FRAC M01) lên vết cắt.'] },
      ],
      g(`${recheck}: lỗ đục còn đùn mạt tươi không; theo dõi cành héo mới.`, logPhi),
    ),
  },
];

export function protocolById(id: string): Protocol | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}

/** Tìm phác đồ theo tên, tác nhân, hoạt chất, nội dung — không phân biệt dấu. */
export function searchProtocols(query: string): Protocol[] {
  const q = normalizeVi(query);
  if (!q) return [...PROTOCOLS];
  return PROTOCOLS.filter((p) => {
    const text = [p.name, p.agents, ...p.actives.map((a) => `${a.name} ${a.group}`), ...p.steps.flatMap((s) => s.groups.flatMap((gr) => [gr.label ?? '', ...gr.items]))].join(' ');
    return normalizeVi(text).includes(q);
  });
}
