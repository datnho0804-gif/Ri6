import type { ISODate, Log } from '../types/models';
import { diffDays, formatDateVN } from './date';
import { PROTOCOLS } from './protocols';
import { normalizeVi } from './text';

/**
 * Danh mục vật tư: thuốc BVTV, phân bón, vật tư (SPEC §3.6 [1.2]).
 *
 * Nguyên tắc dữ liệu (AGENTS §3 [1.2]):
 * - Ghi thương hiệu phổ biến, hoạt chất + nhóm FRAC/IRAC, quy cách thường gặp, cách dùng.
 * - **Không bịa.** Giá chỉ ghi khi có nguồn công khai, kèm tháng (`asOf`) và nguồn (`source`).
 *   Liều pha chỉ ghi khi có trên nhãn đăng ký; không chắc thì để "theo nhãn".
 * - Giá thật của vườn được "học" từ nhật ký (`Log.priceVnd`) và luôn ưu tiên hơn giá tham khảo.
 * - Không có hoạt chất đã bị loại khỏi Danh mục (xem `BANNED_ACTIVE_INGREDIENTS`).
 */

export type SupplyCategory = 'thuoc_bvtv' | 'phan_bon' | 'vat_tu';

export const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  thuoc_bvtv: 'Thuốc BVTV',
  phan_bon: 'Phân bón',
  vat_tu: 'Vật tư',
};

export interface SupplyPrice {
  /** Khoảng giá VNĐ cho 1 đơn vị `per`. */
  rangeVnd: readonly [number, number];
  /** Đơn vị tính giá, ví dụ "bao 50 kg". */
  per: string;
  /** Tháng lấy giá, `YYYY-MM`. */
  asOf: string;
  /** Nguồn công khai của số liệu. */
  source: string;
}

export interface SupplyItem {
  id: string;
  category: SupplyCategory;
  /** Tên sản phẩm như trên bao bì, ví dụ "Ridomil Gold 68WG". */
  name: string;
  /** Hãng / thương hiệu; "Nhiều hãng" với hàng phổ thông. */
  brand: string;
  /** Hoạt chất (thuốc) hoặc thành phần chính (phân, vật tư). */
  activeIngredient: string;
  /** Nhóm cơ chế, ví dụ "FRAC 4 + M03", "IRAC 6". Chỉ thuốc BVTV. */
  moaGroup?: string;
  /** Quy cách đóng gói thường gặp. */
  packaging: readonly string[];
  /** Giá tham khảo — CHỈ khi có nguồn. */
  price?: SupplyPrice;
  /** Cách dùng (phương pháp, thời điểm). */
  usageGuide: string;
  /** Liều pha: chỉ ghi khi có trên nhãn đăng ký; còn lại "Theo nhãn". */
  doseNote: string;
  /** PHI (ngày) — chỉ ghi khi có trên nhãn; không có thì hiển thị "theo nhãn". */
  phiDays?: number;
  /** Liên kết phác đồ trong `PROTOCOLS`. */
  protocolIds: readonly string[];
  /** Đối tượng / giai đoạn dùng. */
  targets: readonly string[];
  safetyNote: string;
}

export const SUPPLY_PRICE_DISCLAIMER =
  'Giá tham khảo theo tháng và nguồn ghi kèm, thay đổi theo đại lý và thời điểm. Ghi giá bạn mua vào nhật ký để app dùng giá thật của vườn.';

export const SUPPLY_LABEL_NOTE =
  'Thương hiệu, quy cách là thông tin phổ biến trên thị trường. Luôn đối chiếu nhãn sản phẩm và Danh mục thuốc BVTV được phép sử dụng tại Việt Nam hiện hành; liều pha và PHI theo nhãn.';

/**
 * Hoạt chất đã bị loại khỏi Danh mục thuốc BVTV được phép tại VN (2017–2019).
 * Không được xuất hiện trong danh mục vật tư; AI được nhắc không đề xuất.
 */
export const BANNED_ACTIVE_INGREDIENTS: readonly string[] = [
  'Carbendazim',
  'Benomyl',
  'Thiophanate-methyl',
  'Chlorpyrifos ethyl',
  'Fipronil',
  'Glyphosate',
  '2,4-D',
  'Paraquat',
];

const LABEL = 'Theo nhãn đăng ký — đọc kỹ nhãn trước khi pha.';
const NO_BLOOM = 'Không phun khi cây đang xổ nhụy/hoa nở.';
const PPE = 'Mang găng, khẩu trang, kính khi pha và phun; không phun ngược gió.';

export const SUPPLIES: readonly SupplyItem[] = [
  /* ---------- Thuốc BVTV — Xì mủ, thối rễ (Phytophthora) ---------- */
  {
    id: 'ridomil-gold-68wg',
    category: 'thuoc_bvtv',
    name: 'Ridomil Gold 68WG',
    brand: 'Syngenta',
    activeIngredient: 'Metalaxyl-M + Mancozeb',
    moaGroup: 'FRAC 4 + M03',
    packaging: ['gói 100 g', 'gói 1 kg'],
    usageGuide: 'Phun tán hoặc quét lên vết bệnh đã cạo sạch; luân phiên với nhóm P07, 40.',
    doseNote: LABEL,
    protocolIds: ['phytophthora'],
    targets: ['Xì mủ thân', 'Thối rễ'],
    safetyNote: `${PPE} Không dùng nhóm FRAC 4 liên tục quá 2 lần.`,
  },
  {
    id: 'aliette-800wg',
    category: 'thuoc_bvtv',
    name: 'Aliette 800WG',
    brand: 'Bayer',
    activeIngredient: 'Fosetyl-aluminium',
    moaGroup: 'FRAC P07',
    packaging: ['gói 100 g', 'gói 1 kg'],
    usageGuide: 'Phun tán hoặc tưới gốc; lưu dẫn hai chiều nên dùng phòng tốt đầu mùa mưa.',
    doseNote: LABEL,
    protocolIds: ['phytophthora'],
    targets: ['Xì mủ thân', 'Thối rễ'],
    safetyNote: `${PPE} Cùng nhóm P07 với Phosphonate — không coi là luân phiên.`,
  },
  {
    id: 'agri-fos-400',
    category: 'thuoc_bvtv',
    name: 'Agri-Fos 400',
    brand: 'Agrichem (Úc)',
    activeIngredient: 'Phosphonate (axit photphorơ)',
    moaGroup: 'FRAC P07',
    packaging: ['chai 1 L', 'can 5 L'],
    usageGuide: 'Tiêm thân hoặc phun tán theo nhãn; dùng phòng và chữa xì mủ.',
    doseNote: LABEL,
    protocolIds: ['phytophthora'],
    targets: ['Xì mủ thân', 'Thối rễ'],
    safetyNote: `${PPE} Cùng nhóm P07 với Fosetyl-aluminium.`,
  },
  {
    id: 'acrobat-mz-90-600wp',
    category: 'thuoc_bvtv',
    name: 'Acrobat MZ 90/600WP',
    brand: 'BASF',
    activeIngredient: 'Dimethomorph + Mancozeb',
    moaGroup: 'FRAC 40 + M03',
    packaging: ['gói 100 g', 'gói 1 kg'],
    usageGuide: 'Phun tán hoặc quét vết bệnh; luân phiên với nhóm 4 và P07.',
    doseNote: LABEL,
    protocolIds: ['phytophthora'],
    targets: ['Xì mủ thân', 'Thối trái'],
    safetyNote: PPE,
  },
  /* ---------- Cháy lá (Rhizoctonia), nấm hồng ---------- */
  {
    id: 'validacin-5l',
    category: 'thuoc_bvtv',
    name: 'Validacin 5L',
    brand: 'Nhiều nhà phân phối',
    activeIngredient: 'Validamycin',
    moaGroup: 'FRAC 26',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun ướt đều tán lá, cành bị bệnh; luân phiên với nhóm 3, 11.',
    doseNote: LABEL,
    protocolIds: ['rhizoctonia', 'nam-hong'],
    targets: ['Cháy lá', 'Nấm hồng'],
    safetyNote: PPE,
  },
  {
    id: 'anvil-5sc',
    category: 'thuoc_bvtv',
    name: 'Anvil 5SC',
    brand: 'Syngenta',
    activeIngredient: 'Hexaconazole',
    moaGroup: 'FRAC 3',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun khi bệnh chớm xuất hiện; quét lên vết nấm hồng đã cạo.',
    doseNote: LABEL,
    protocolIds: ['rhizoctonia', 'nam-hong'],
    targets: ['Cháy lá', 'Nấm hồng'],
    safetyNote: `${PPE} ${NO_BLOOM}`,
  },
  {
    id: 'amistar-250sc',
    category: 'thuoc_bvtv',
    name: 'Amistar 250SC',
    brand: 'Syngenta',
    activeIngredient: 'Azoxystrobin',
    moaGroup: 'FRAC 11',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun phòng/trị cháy lá; nhóm 11 dễ kháng — tối đa 2 lần/vụ, luân phiên.',
    doseNote: LABEL,
    protocolIds: ['rhizoctonia'],
    targets: ['Cháy lá'],
    safetyNote: PPE,
  },
  {
    id: 'kocide-46-1wg',
    category: 'thuoc_bvtv',
    name: 'Kocide 46.1WG',
    brand: 'Corteva',
    activeIngredient: 'Đồng hydroxide',
    moaGroup: 'FRAC M01',
    packaging: ['gói', 'bao'],
    usageGuide: 'Quét hoặc phun lên vết nấm hồng đã cạo; quét vết cắt cành sau cắt tỉa.',
    doseNote: LABEL,
    protocolIds: ['nam-hong', 'mot-xen-toc'],
    targets: ['Nấm hồng', 'Vết cắt cành'],
    safetyNote: `${PPE} ${NO_BLOOM}`,
  },
  /* ---------- Rầy, rệp sáp ---------- */
  {
    id: 'actara-25wg',
    category: 'thuoc_bvtv',
    name: 'Actara 25WG',
    brand: 'Syngenta',
    activeIngredient: 'Thiamethoxam',
    moaGroup: 'IRAC 4A',
    packaging: ['gói nhỏ', 'hộp'],
    usageGuide: 'Phun khi đọt vừa nhú; không dùng nhóm 4A quá 2 lần liên tiếp.',
    doseNote: LABEL,
    protocolIds: ['ray', 'duc-trai-rep-sap'],
    targets: ['Rầy xanh, rầy phấn', 'Rệp sáp'],
    safetyNote: `${PPE} ĐỘC VỚI ONG — tuyệt đối không phun khi hoa nở.`,
  },
  {
    id: 'applaud-25wp',
    category: 'thuoc_bvtv',
    name: 'Applaud 25WP',
    brand: 'Nihon Nohyaku',
    activeIngredient: 'Buprofezin',
    moaGroup: 'IRAC 16',
    packaging: ['gói', 'hộp'],
    usageGuide: 'Diệt rầy non và rệp sáp non (ức chế lột xác); phun sớm khi mật độ thấp.',
    doseNote: LABEL,
    protocolIds: ['ray', 'duc-trai-rep-sap'],
    targets: ['Rầy non', 'Rệp sáp non'],
    safetyNote: PPE,
  },
  {
    id: 'movento-150od',
    category: 'thuoc_bvtv',
    name: 'Movento 150OD',
    brand: 'Bayer',
    activeIngredient: 'Spirotetramat',
    moaGroup: 'IRAC 23',
    packaging: ['chai 100 ml', 'chai 500 ml'],
    usageGuide: 'Lưu dẫn hai chiều — hiệu quả với rệp sáp ẩn trong cuống trái, kẽ lá.',
    doseNote: LABEL,
    protocolIds: ['ray', 'duc-trai-rep-sap'],
    targets: ['Rệp sáp', 'Rầy'],
    safetyNote: PPE,
  },
  {
    id: 'sk-enspray-99ec',
    category: 'thuoc_bvtv',
    name: 'SK Enspray 99EC',
    brand: 'SK (Hàn Quốc)',
    activeIngredient: 'Dầu khoáng (petroleum spray oil)',
    packaging: ['chai 1 L', 'can 4–5 L'],
    usageGuide: 'Tác động vật lý (làm ngạt); phối hợp luân phiên với thuốc khác trị rầy, rệp sáp, nhện đỏ.',
    doseNote: LABEL,
    protocolIds: ['ray', 'nhen-do', 'duc-trai-rep-sap'],
    targets: ['Rầy', 'Nhện đỏ', 'Rệp sáp'],
    safetyNote: 'Không phun lúc nắng gắt (> 32 °C) hoặc khi cây thiếu nước; không phun khi xổ nhụy.',
  },
  /* ---------- Nhện đỏ ---------- */
  {
    id: 'reasgant-3-6ec',
    category: 'thuoc_bvtv',
    name: 'Reasgant 3.6EC',
    brand: 'Việt Thắng',
    activeIngredient: 'Abamectin',
    moaGroup: 'IRAC 6',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun ướt kỹ mặt dưới lá; nhóm 6 — không dùng liên tục với Emamectin (cùng nhóm).',
    doseNote: LABEL,
    protocolIds: ['nhen-do'],
    targets: ['Nhện đỏ'],
    safetyNote: PPE,
  },
  {
    id: 'nissorun-5ec',
    category: 'thuoc_bvtv',
    name: 'Nissorun 5EC',
    brand: 'Nippon Soda',
    activeIngredient: 'Hexythiazox',
    moaGroup: 'IRAC 10A',
    packaging: ['chai'],
    usageGuide: 'Diệt trứng và nhện non; phun đầu đợt bùng phát, phối hợp thuốc diệt nhện trưởng thành nhóm khác.',
    doseNote: LABEL,
    protocolIds: ['nhen-do'],
    targets: ['Nhện đỏ (trứng, nhện non)'],
    safetyNote: PPE,
  },
  {
    id: 'ortus-5sc',
    category: 'thuoc_bvtv',
    name: 'Ortus 5SC',
    brand: 'Nihon Nohyaku',
    activeIngredient: 'Fenpyroximate',
    moaGroup: 'IRAC 21A',
    packaging: ['chai'],
    usageGuide: 'Diệt nhện các pha; phun ướt mặt dưới lá.',
    doseNote: LABEL,
    protocolIds: ['nhen-do'],
    targets: ['Nhện đỏ'],
    safetyNote: PPE,
  },
  {
    id: 'comite-73ec',
    category: 'thuoc_bvtv',
    name: 'Comite 73EC',
    brand: 'UPL / Arysta',
    activeIngredient: 'Propargite',
    moaGroup: 'IRAC 12C',
    packaging: ['chai', 'can'],
    usageGuide: 'Diệt nhện trưởng thành; không phun khi trời nắng nóng gắt (dễ cháy lá non).',
    doseNote: LABEL,
    protocolIds: ['nhen-do'],
    targets: ['Nhện đỏ'],
    safetyNote: `${PPE} Kiểm tra Danh mục hiện hành trước khi mua.`,
  },
  /* ---------- Sâu đục trái, xén tóc ---------- */
  {
    id: 'proclaim-1-9ec',
    category: 'thuoc_bvtv',
    name: 'Proclaim 1.9EC',
    brand: 'Syngenta',
    activeIngredient: 'Emamectin benzoate',
    moaGroup: 'IRAC 6',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun khi trưởng thành đẻ trứng/sâu non mới nở; bơm vào lỗ đục xén tóc rồi bịt lại.',
    doseNote: LABEL,
    protocolIds: ['duc-trai-rep-sap', 'mot-xen-toc'],
    targets: ['Sâu đục trái', 'Xén tóc'],
    safetyNote: PPE,
  },
  {
    id: 'prevathon-5sc',
    category: 'thuoc_bvtv',
    name: 'Prevathon 5SC',
    brand: 'FMC',
    activeIngredient: 'Chlorantraniliprole',
    moaGroup: 'IRAC 28',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun phòng sâu đục trái giai đoạn trái non; bơm lỗ đục xén tóc.',
    doseNote: LABEL,
    protocolIds: ['duc-trai-rep-sap', 'mot-xen-toc'],
    targets: ['Sâu đục trái', 'Xén tóc'],
    safetyNote: PPE,
  },
  {
    id: 'radiant-60sc',
    category: 'thuoc_bvtv',
    name: 'Radiant 60SC',
    brand: 'Corteva',
    activeIngredient: 'Spinetoram',
    moaGroup: 'IRAC 5',
    packaging: ['chai'],
    usageGuide: 'Luân phiên trị sâu đục trái.',
    doseNote: LABEL,
    protocolIds: ['duc-trai-rep-sap'],
    targets: ['Sâu đục trái'],
    safetyNote: PPE,
  },
  {
    id: 'ammate-150sc',
    category: 'thuoc_bvtv',
    name: 'Ammate 150SC',
    brand: 'FMC',
    activeIngredient: 'Indoxacarb',
    moaGroup: 'IRAC 22A',
    packaging: ['chai'],
    usageGuide: 'Luân phiên trị sâu đục trái.',
    doseNote: LABEL,
    protocolIds: ['duc-trai-rep-sap'],
    targets: ['Sâu đục trái'],
    safetyNote: PPE,
  },
  {
    id: 'xentari-35wdg',
    category: 'thuoc_bvtv',
    name: 'XenTari 35WDG',
    brand: 'Sumitomo Chemical',
    activeIngredient: 'Bacillus thuringiensis',
    moaGroup: 'IRAC 11A',
    packaging: ['gói', 'hộp'],
    usageGuide: 'Thuốc sinh học — phun chiều mát khi sâu non mới nở; an toàn gần thu hoạch hơn thuốc hóa học.',
    doseNote: LABEL,
    protocolIds: ['duc-trai-rep-sap'],
    targets: ['Sâu đục trái (sâu non)'],
    safetyNote: 'Bảo quản nơi mát; pha xong dùng ngay.',
  },
  {
    id: 'fastac-5ec',
    category: 'thuoc_bvtv',
    name: 'Fastac 5EC',
    brand: 'BASF',
    activeIngredient: 'Alpha-cypermethrin',
    moaGroup: 'IRAC 3A',
    packaging: ['chai', 'can'],
    usageGuide: 'Phun thân/cành khi xén tóc trưởng thành vũ hóa.',
    doseNote: LABEL,
    protocolIds: ['mot-xen-toc'],
    targets: ['Xén tóc trưởng thành'],
    safetyNote: `${PPE} Độc với ong và cá — ${NO_BLOOM}`,
  },

  /* ---------- Phân bón ---------- */
  {
    id: 'ure-phu-my',
    category: 'phan_bon',
    name: 'Urê Phú Mỹ',
    brand: 'Đạm Phú Mỹ (PVFCCo)',
    activeIngredient: 'Đạm urê 46% N',
    packaging: ['bao 50 kg'],
    price: { rangeVnd: [610_000, 660_000], per: 'bao 50 kg', asOf: '2026-11', source: 'chogia.vn — Đông Nam Bộ & Tây Nguyên, 14/11/2026' },
    usageGuide: 'Chia nhỏ nhiều lần, bón quanh hình chiếu tán rồi tưới; giảm đạm từ ngày 62 sau xổ nhụy.',
    doseNote: 'Theo tuổi cây và kết quả đất — hỏi cán bộ khuyến nông.',
    protocolIds: [],
    targets: ['Cơi đọt', 'Kiến thiết'],
    safetyNote: 'Bón sau vôi/Dolomite ≥ 10 ngày; không bón sát gốc.',
  },
  {
    id: 'npk-16-16-8-phu-my',
    category: 'phan_bon',
    name: 'NPK Phú Mỹ 16-16-8+13S',
    brand: 'Đạm Phú Mỹ (PVFCCo)',
    activeIngredient: 'N 16% – P₂O₅ 16% – K₂O 8% + S 13%',
    packaging: ['bao 50 kg'],
    price: { rangeVnd: [690_000, 740_000], per: 'bao 50 kg', asOf: '2026-05', source: 'Báo Hà Tĩnh tổng hợp giá phân bón, 05/2026' },
    usageGuide: 'Bón nuôi cơi đọt, phục hồi sau thu hoạch.',
    doseNote: 'Theo tuổi cây — hỏi cán bộ khuyến nông.',
    protocolIds: [],
    targets: ['Cơi đọt', 'Phục hồi'],
    safetyNote: 'Bón sau vôi/Dolomite ≥ 10 ngày (có lân).',
  },
  {
    id: 'kali-phu-my',
    category: 'phan_bon',
    name: 'Kali Phú Mỹ (KCl)',
    brand: 'Đạm Phú Mỹ (PVFCCo)',
    activeIngredient: 'Kali clorua 60% K₂O',
    packaging: ['bao 50 kg'],
    price: { rangeVnd: [510_000, 580_000], per: 'bao 50 kg', asOf: '2026-05', source: 'Báo Hà Tĩnh tổng hợp giá phân bón, 05/2026' },
    usageGuide: 'Chuyển sang phân giàu Kali ngày 55–65 sau xổ nhụy (lên cơm).',
    doseNote: 'Theo số trái và tuổi cây — hỏi cán bộ khuyến nông.',
    protocolIds: ['rung-trai-chay-mui'],
    targets: ['Nuôi trái, lên cơm'],
    safetyNote: 'Tưới đủ ẩm sau bón.',
  },
  {
    id: 'voi-dolomite',
    category: 'phan_bon',
    name: 'Vôi Dolomite',
    brand: 'Nhiều hãng',
    activeIngredient: 'CaMg(CO₃)₂',
    packaging: ['bao 25 kg', 'bao 50 kg'],
    usageGuide: 'Bón đầu mùa mưa khi pH đất < 5,5; rải đều quanh tán rồi xới nhẹ.',
    doseNote: 'Theo kết quả đo pH đất.',
    protocolIds: ['phytophthora'],
    targets: ['Nâng pH đất'],
    safetyNote: 'Cách bón hữu cơ/Trichoderma ≥ 15 ngày, urê/lân ≥ 10 ngày.',
  },
  {
    id: 'trichoderma',
    category: 'phan_bon',
    name: 'Chế phẩm Trichoderma',
    brand: 'Nhiều hãng',
    activeIngredient: 'Nấm đối kháng Trichoderma spp.',
    packaging: ['gói 1 kg'],
    usageGuide: 'Trộn với phân hữu cơ hoai rồi bón quanh gốc; giữ ẩm đất.',
    doseNote: 'Theo hướng dẫn trên bao bì.',
    protocolIds: ['phytophthora'],
    targets: ['Phòng thối rễ', 'Cải tạo đất'],
    safetyNote: 'Không trộn chung với vôi hoặc thuốc trừ nấm; bón sau vôi ≥ 15 ngày.',
  },
  {
    id: 'canxi-bo',
    category: 'phan_bon',
    name: 'Phân bón lá Canxi-Bo',
    brand: 'Nhiều hãng',
    activeIngredient: 'Canxi + Bo',
    packaging: ['chai 500 ml', 'chai 1 L'],
    usageGuide: 'Phun trong 30 ngày đầu sau xổ nhụy, kết hợp chặn đọt — giảm rụng trái non, sượng cơm.',
    doseNote: 'Theo nhãn sản phẩm.',
    protocolIds: ['rung-trai-chay-mui'],
    targets: ['Đậu trái', 'Chống rụng trái non'],
    safetyNote: 'Không phun lúc nắng gắt.',
  },

  /* ---------- Vật tư ---------- */
  {
    id: 'bec-tuoi-goc',
    category: 'vat_tu',
    name: 'Béc tưới gốc',
    brand: 'Nhiều hãng',
    activeIngredient: 'Béc phun mưa / béc bù áp',
    packaging: ['cái'],
    usageGuide: 'Lô A 1 béc/cây cách gốc 40–50 cm; Lô B 2–3 béc/cây cách gốc 1–1,5 m, đặt đối xứng.',
    doseNote: '—',
    protocolIds: [],
    targets: ['Tưới'],
    safetyNote: 'Không để béc phun vào cổ rễ hoặc thân.',
  },
  {
    id: 'may-do-ph-dat',
    category: 'vat_tu',
    name: 'Máy đo pH & ẩm đất cầm tay',
    brand: 'Takemura DM-15 hoặc tương đương',
    activeIngredient: 'Đo pH đất 3,5–8 và ẩm độ',
    packaging: ['cái'],
    usageGuide: 'Cắm sâu 10–15 cm vào đất ẩm, lau sạch đầu đo giữa các lần; ghi nhật ký "Đo pH".',
    doseNote: '—',
    protocolIds: [],
    targets: ['Đo pH đất'],
    safetyNote: 'Đối chiếu định kỳ với mẫu đất gửi phòng thí nghiệm.',
  },
  {
    id: 'tui-bao-trai',
    category: 'vat_tu',
    name: 'Túi bao trái sầu riêng',
    brand: 'Nhiều hãng',
    activeIngredient: 'Túi lưới / túi vải không dệt',
    packaging: ['xấp 100 túi'],
    usageGuide: 'Bao khi trái đã qua giai đoạn rụng sinh lý; giảm sâu đục trái, rệp sáp.',
    doseNote: '—',
    protocolIds: ['duc-trai-rep-sap'],
    targets: ['Sâu đục trái', 'Rệp sáp'],
    safetyNote: 'Phun phòng trước khi bao.',
  },
  {
    id: 'keo-cat-canh',
    category: 'vat_tu',
    name: 'Kéo / cưa cắt cành',
    brand: 'Nhiều hãng',
    activeIngredient: 'Dụng cụ cắt tỉa',
    packaging: ['cái'],
    usageGuide: 'Cắt sát cổ cành, vết cắt nghiêng; quét thuốc gốc đồng lên vết cắt lớn.',
    doseNote: '—',
    protocolIds: ['mot-xen-toc'],
    targets: ['Cắt tỉa'],
    safetyNote: 'Khử trùng lưỡi cắt bằng cồn giữa các cây bệnh.',
  },
];

/* ======================= Tra cứu ======================= */

const byId = new Map(SUPPLIES.map((s) => [s.id, s]));

export function supplyById(id: string | undefined): SupplyItem | undefined {
  return id ? byId.get(id) : undefined;
}

export function filterSupplies(
  opts: { category?: SupplyCategory; protocolId?: string; moaGroup?: string } = {},
  list: readonly SupplyItem[] = SUPPLIES,
): SupplyItem[] {
  const moa = opts.moaGroup ? normalizeVi(opts.moaGroup) : '';
  return list.filter(
    (s) =>
      (!opts.category || s.category === opts.category) &&
      (!opts.protocolId || s.protocolIds.includes(opts.protocolId)) &&
      (!moa || (s.moaGroup ? normalizeVi(s.moaGroup).split(' + ').some((g) => g === moa) : false)),
  );
}

/** Tìm không phân biệt dấu trên tên, hãng, hoạt chất, nhóm cơ chế, đối tượng, cách dùng. */
export function searchSupplies(query: string, list: readonly SupplyItem[] = SUPPLIES): SupplyItem[] {
  const terms = normalizeVi(query).split(' ').filter(Boolean);
  if (!terms.length) return [...list];
  return list.filter((s) => {
    const hay = normalizeVi([s.name, s.brand, s.activeIngredient, s.moaGroup ?? '', ...s.targets, s.usageGuide].join(' '));
    return terms.every((t) => hay.includes(t));
  });
}

export function getSuppliesForProtocol(protocolId: string): SupplyItem[] {
  return filterSupplies({ protocolId });
}

export function isBannedActive(name: string): boolean {
  const n = normalizeVi(name);
  return BANNED_ACTIVE_INGREDIENTS.some((b) => n.includes(normalizeVi(b)));
}

/* ======================= Giá ======================= */

const vnd = (v: number) => v.toLocaleString('vi-VN').replace(/,/g, '.');

/** "610.000–660.000 đ/bao 50 kg · giá tham khảo 11/2026"; không có giá → "Chưa có giá tham khảo". */
export function formatPrice(price: SupplyPrice | undefined): string {
  if (!price) return 'Chưa có giá tham khảo';
  const [a, b] = price.rangeVnd;
  const amount = a === b ? vnd(a) : `${vnd(a)}–${vnd(b)}`;
  return `${amount} đ/${price.per} · giá tham khảo ${price.asOf.slice(5, 7)}/${price.asOf.slice(0, 4)}`;
}

export interface LearnedPrice {
  priceVnd: number;
  date: ISODate;
  logId: string;
}

/** Giá chủ vườn thực trả gần nhất cho vật tư (từ `Log.priceVnd`) — phần "tự học" giá. */
export function learnedPrice(logs: readonly Log[], supplyId: string): LearnedPrice | null {
  let best: LearnedPrice | null = null;
  for (const l of logs) {
    if (l.deletedAt || l.supplyId !== supplyId || typeof l.priceVnd !== 'number' || !(l.priceVnd > 0)) continue;
    if (!best || l.date > best.date || (l.date === best.date && l.id > best.logId)) best = { priceVnd: l.priceVnd, date: l.date, logId: l.id };
  }
  return best;
}

/** Dòng giá hiển thị: ưu tiên giá vườn đã mua, sau đó mới tới giá tham khảo. */
export function priceLine(item: SupplyItem, logs: readonly Log[]): string {
  const p = learnedPrice(logs, item.id);
  return p ? `${vnd(p.priceVnd)} đ (giá vườn mua ${formatDateVN(p.date)})` : formatPrice(item.price);
}

/* ======================= Nhóm cơ chế & luân phiên ======================= */

/** Bảng hoạt chất → nhóm, lấy từ 8 phác đồ (một nguồn với thẻ phác đồ). */
const ACTIVE_GROUPS: Array<{ key: string; group: string }> = (() => {
  const out: Array<{ key: string; group: string }> = [];
  for (const p of PROTOCOLS) {
    for (const a of p.actives) {
      for (const part of a.name.split('/')) {
        const key = normalizeVi(part.replace(/\(.*?\)/g, ''));
        if (key && !out.some((o) => o.key === key)) out.push({ key, group: a.group });
      }
    }
  }
  for (const s of SUPPLIES) {
    if (!s.moaGroup) continue;
    const key = normalizeVi(s.activeIngredient);
    if (!out.some((o) => o.key === key)) out.push({ key, group: s.moaGroup });
  }
  return out.sort((x, y) => y.key.length - x.key.length);
})();

/** Nhóm cơ chế của một nhật ký phun: theo `supplyId`, nếu không thì dò tên hoạt chất. */
export function moaGroupOf(log: Pick<Log, 'supplyId' | 'activeIngredient'>): string | null {
  const s = supplyById(log.supplyId);
  if (s?.moaGroup) return s.moaGroup;
  const text = normalizeVi(log.activeIngredient ?? '');
  if (!text) return null;
  return ACTIVE_GROUPS.find((a) => text.includes(a.key))?.group ?? null;
}

export interface RotationAlert {
  targetId: string;
  group: string;
  count: number;
  lastDate: ISODate;
}

/**
 * Cảnh báo luân phiên: cùng một cây phun ≥ `sameGroupCount` lần cùng nhóm cơ chế
 * trong `windowDays` ngày gần nhất (tính tới `today`).
 */
export function rotationAlerts(
  logs: readonly Log[],
  today: ISODate,
  opts: { sameGroupCount: number; windowDays: number },
): RotationAlert[] {
  const map = new Map<string, RotationAlert>();
  for (const l of logs) {
    if (l.deletedAt || l.type !== 'phun-thuoc') continue;
    const age = diffDays(l.date, today);
    if (age < 0 || age > opts.windowDays) continue;
    const group = moaGroupOf(l);
    if (!group) continue;
    const k = `${l.targetId}|${group}`;
    const cur = map.get(k);
    if (cur) {
      cur.count += 1;
      if (l.date > cur.lastDate) cur.lastDate = l.date;
    } else map.set(k, { targetId: l.targetId, group, count: 1, lastDate: l.date });
  }
  return [...map.values()]
    .filter((a) => a.count >= opts.sameGroupCount)
    .sort((a, b) => (a.targetId === b.targetId ? a.group.localeCompare(b.group) : a.targetId < b.targetId ? -1 : 1));
}

/** Dòng tóm tắt 1 vật tư cho prompt AI. */
export function describeSupply(s: SupplyItem, logs: readonly Log[] = []): string {
  return `- ${s.name} (${s.brand}) [${s.id}]: ${s.activeIngredient}${s.moaGroup ? `, ${s.moaGroup}` : ''}; ${s.packaging.join(', ')}; giá: ${priceLine(s, logs)}; ${s.usageGuide}`;
}
