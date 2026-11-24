# ĐẶC TẢ — Sổ Tay Vườn Sầu Riêng Ri6 (Lộc Tấn, Đồng Nai)

| Mục | Giá trị |
|---|---|
| Phiên bản đặc tả | 1.0 — 24/11/2026 |
| Nguồn | `docs/muctieu-goc.md` (yêu cầu gốc của chủ vườn); file này chuẩn hóa và bổ sung |
| Người soạn / duyệt | Claude (reviewer) / anh Đạt (chủ vườn) |
| Bên thực hiện | Antigravity — xem `AGENTS.md`, `docs/TASKS.md` |

Các mục đánh dấu **[BS]** là phần Claude bổ sung hoặc sửa so với yêu cầu gốc. Mỗi mục có ghi lý do.

## 1. Mục tiêu và phạm vi

App ghi chép và quản lý vườn sầu riêng Ri6. Vườn trên đất đỏ bazan, tưới bằng béc tưới gốc, khí hậu Đông Nam Bộ. App phải:
1. Dùng tốt trên **điện thoại Android ngoài vườn**, kể cả khi sóng yếu hoặc mất mạng (offline-first).
2. Chạy được ở **3 dạng** từ cùng một mã nguồn:
   - Web/PWA trên GitHub Pages: `https://datnho0804-gif.github.io/Ri6/`.
   - **APK Android** cài được trên nhiều máy.
   - Trình duyệt máy tính.
3. **[BS] Tự động sao lưu và đồng bộ** dữ liệu giữa nhiều máy qua **repo riêng tư** `datnho0804-gif/Ri6-data`.

Ngoài phạm vi: backend riêng, đăng nhập nhiều người dùng, iOS app store.

## 2. Hồ sơ vườn

| Lô | Số cây | Tuổi | Cách quản lý |
|---|---|---|---|
| **A** | 50 | 1 năm (kiến thiết cơ bản) | Theo **lô** (`LOT_A`): một hồ sơ chung, nhật ký chung, ảnh lô tùy chọn |
| **B** | 15 | 3–5 năm | Theo **từng cây** `SR01`–`SR15`, khởi tạo trống |

Hai lô có phác đồ phân và nước **riêng**, không gộp chung.

## 3. Dữ liệu nông học

### 3.1 Lô A — kiến thiết cơ bản
- Chu kỳ cơi đọt 45–60 ngày.
- Giữ 1 thân thẳng; cành cấp 1 tạo góc 70–90° với thân.
- Tủ gốc dày 10–20 cm, chừa cách gốc 10–20 cm.

### 3.2 Mốc sinh lý Ri6 (dùng cho máy tính và dự báo từng cây)

| Mốc | Tính từ | Khoảng (ngày) |
|---|---|---|
| Mắt cua → Xổ nhụy | mắt cua | 55–57 |
| Tưới nhấp (1 ngày tưới – 1 ngày nghỉ, tùy ẩm đất) | xổ nhụy | 3–7 ngày đầu |
| Chặn đọt non chặt + bổ sung Canxi-Bo | xổ nhụy | 0–30 |
| Chuyển NPK giàu Kali (ví dụ 12-11-18) | xổ nhụy | 55–65 |
| Lên cơm mạnh | xổ nhụy | 60–65 |
| **[BS]** Bắt đầu giảm đạm, giữ ẩm ổn định (chống sượng, cháy múi) | xổ nhụy | từ ngày 62 (≈ 4 tuần trước mốc thu sớm nhất) |
| Thu hoạch | xổ nhụy | 90–105 |

**Quy tắc lan truyền khoảng.** Khi nhập ngày mắt cua:
- Mốc sớm = mắt cua + 55 + (cận dưới).
- Mốc muộn = mắt cua + 57 + (cận trên).

Ví dụ: mắt cua → thu hoạch = **145–162 ngày**.

### 3.3 Đất đỏ bazan và béc tưới gốc
- Giữ pH đất **5,5–6,5**.
- Bón vôi/Dolomite đầu và cuối mùa mưa, cách phân hữu cơ/Trichoderma **≥ 10–15 ngày**.
- **[BS]** Vôi cũng phải cách phân đạm urê/amoni và phân lân **≥ 7–10 ngày**. Lý do: bón chung thì đạm mất do bay hơi NH₃ và lân bị cố định.
- **Không bao giờ** đặt béc phun thẳng vào cổ rễ hoặc thân, để tránh nấm *Phytophthora*.

| | Lô A (1 năm) | Lô B (3–5 năm) |
|---|---|---|
| Số béc / cây | 1 | 2–3, đặt đối xứng |
| Vị trí | cách gốc 40–50 cm | cách gốc 1–1,5 m |
| Bán kính phun | 0,5–0,8 m | phủ tới rìa tán |
| Lượng nước | 20–40 L/cây/lần | 150–200 L/cây/ngày khi nuôi trái |
| Van | — | van khóa riêng cho lô, để xiết nước làm bông |

**[BS]** Mức 150–200 L hợp với cây tán khoảng 4–5 m. Cây 3 năm tán nhỏ nên thường cần ít hơn. Máy tính chỉ **cảnh báo** khi số nhập nằm ngoài khoảng, **không chặn**.

### 3.4 Mùa vụ Đông Nam Bộ
- Mùa khô: **T11–T4**. Mùa mưa: **T5–T10**.
- App tự chọn mùa theo tháng hiện tại; người dùng có thể đổi tay.

Khuyến cáo tối thiểu theo mùa:
- **Mùa khô:**
  - Tưới theo lịch béc; giữ lớp tủ gốc.
  - Xiết nước làm bông cho Lô B (chỉ cây đã đủ cơi đọt).
  - Soi nhện đỏ và rầy xanh, vì khô nóng làm chúng bùng phát.
  - Không để béc phun vào thân.
- **Mùa mưa:**
  - Khơi rãnh thoát nước, không để đọng quanh gốc.
  - Kiểm tra xì mủ gốc (*Phytophthora*) mỗi tuần.
  - Bón vôi đầu mùa, sau đó mới bón hữu cơ + Trichoderma.
  - Theo dõi cháy lá và nấm hồng khi ẩm độ cao.
  - Cắt tỉa sau thu hoạch vào ngày nắng ráo.

### 3.5 Phác đồ sâu bệnh — 5 bước mỗi phác đồ
Năm bước gồm: (1) Nhận định → (2) Kiểm tra tại vườn → (3) Canh tác & béc tưới → (4) Hoạt chất luân phiên → (5) Theo dõi 7–14 ngày và nhắc **PHI**.

| # | Phác đồ | Gợi ý hoạt chất (nhóm FRAC/IRAC) |
|---|---|---|
| 1 | Xì mủ, thối rễ *Phytophthora palmivora* | Metalaxyl-M (FRAC 4), Fosetyl-Al / Phosphonate (P07), Dimethomorph (40); sinh học: Trichoderma |
| 2 | **[BS]** Cháy lá *Rhizoctonia solani* | Validamycin (U18), Hexaconazole (3), Azoxystrobin (11) |
| 3 | **[BS]** Nấm hồng *Erythricium salmonicolor* — cạo vết bệnh, quét thuốc | Đồng hydroxide / oxychloride (M01), Validamycin, Hexaconazole |
| 4 | Rầy xanh (*Allocaridara malayensis*) | Thiamethoxam / Imidacloprid (IRAC 4A, **không phun khi hoa nở**, độc với ong), Buprofezin (16), dầu khoáng |
| 5 | Nhện đỏ | Abamectin (6), Hexythiazox (10A), Fenpyroximate (21A), Propargite (12C), dầu khoáng |
| 6 | Rụng trái non & cháy múi Ri6 | **[BS]** Đây là rối loạn sinh lý, nên bước 4 là "Dinh dưỡng & nước" (Ca-Bo, Kali, ổn định ẩm, chặn đọt, tỉa bớt trái), không phải thuốc |

- **[BS]** Yêu cầu gốc gộp "Cháy lá *Rhizoctonia*/Nấm hồng" làm một. Đặc tả này tách thành 2 phác đồ, vì đây là hai tác nhân khác nhau và cách xử lý khác nhau.
- **[BS]** Luân phiên thuốc phải theo **nhóm cơ chế FRAC/IRAC**. Chỉ đổi tên thương mại mà vẫn cùng nhóm thì không có tác dụng.
- Mỗi phác đồ đều phải hiện dòng: *"Chỉ dùng hoạt chất có trong Danh mục thuốc BVTV được phép sử dụng tại Việt Nam hiện hành; liều lượng và PHI theo nhãn."*

### 3.6 Cắt tỉa

**Checklist 6 dấu hiệu:**
1. Chồi gốc ghép
2. Cành thấp sát đất
3. Cành vượt
4. Cành tăm hoặc cành khô trong lòng tán
5. Cành đan chéo
6. Tán lệch

**Mức cần cắt tỉa** (đếm số dấu hiệu được tick):

| Số dấu hiệu | Mức |
|---|---|
| 0 | Không cần |
| 1–2 | Nhẹ |
| 3–4 | Vừa |
| 5–6 | Mạnh |

Nếu tick "Chồi gốc ghép" thì luôn hiện nhắc "Cắt bỏ chồi gốc ghép ngay".

**3 góc chụp chuẩn:**
1. Toàn tán từ 2 hướng vuông góc, đứng cách mép tán 3–5 m.
2. Ngước từ dưới gốc vào lòng tán, thấy rõ góc cành cấp 1 và cành tăm.
3. Cận cảnh cụm cành nghi vấn, có buộc dây màu hoặc chỉ tay làm mốc.

**Nhắc khi cắt:**
- Cắt vào ngày nắng ráo; cắt sát cổ cành, không để cuống.
- Vết cắt > 2 cm thì quét keo liền sẹo hoặc thuốc gốc đồng.
- **[BS]** Khử trùng dụng cụ bằng cồn 70% khi chuyển sang cây khác, để không lây *Phytophthora*.

## 4. Chức năng

### M1. Tổng quan và nhắc lịch tuần

**KPI:**
- Tổng số cây: 65.
- Số cây Lô B **quá hạn chụp** (xem quy tắc bên dưới).
- Số cây đang **cần cắt tỉa hoặc theo dõi bệnh** (đếm hợp, mỗi cây tính 1 lần).
- Ngưỡng pH 5,5–6,5.
- **[BS]** Cảnh báo PHI, nếu có.

**Các phần khác:**
- Nút đổi **Mùa khô / Mùa mưa** kèm khuyến cáo theo mùa (mục 3.4).
- Lưới 15 ô SR01–SR15: điện thoại 3 cột, máy tính 5 cột. Mỗi ô hiện mã, tên, số ngày kể từ ảnh gần nhất và trạng thái màu kèm chữ. Bấm vào ô thì mở hồ sơ cây.

**Quy tắc trạng thái chụp ảnh tuần.** `d` = số ngày từ ảnh tuần (`kind = weekly`) gần nhất đến hôm nay.

| Trạng thái | Điều kiện | Màu |
|---|---|---|
| "Đã chụp" | 0 ≤ d ≤ 5 | xanh |
| "Sắp đến hạn" | d = 6 hoặc 7 | vàng |
| "Quá hạn" | d ≥ 8, hoặc chưa có ảnh gốc | đỏ |

### M2. Hồ sơ cây SR01–SR15 và nhật ký Lô A

**Danh sách cây:**
- Tìm theo mã, tên, vị trí.
- Bộ lọc:
  - `Tất cả`.
  - `Cần chụp tuần này`: vàng + đỏ.
  - `Cần cắt tỉa`: `needsPruning`.
  - `Theo dõi sâu bệnh`: `diseaseWatch` hoặc `health = benh`.

**Hồ sơ một cây** (trang hoặc modal):
- **Sửa được:** tên hiển thị (ví dụ `SR01 - Góc cổng`), vị trí, tuổi (3/4/5), giai đoạn, sức khỏe, cờ cần cắt tỉa / theo dõi bệnh, **[BS]** ngày mắt cua và ngày xổ nhụy (tùy chọn).
- **Ảnh tuần:**
  - Chụp hoặc chọn ảnh bằng `<input type="file" accept="image/*" capture="environment">`.
  - **Nén trên máy** về cạnh dài ≤ 1280 px, JPEG chất lượng khoảng 0,75, mục tiêu ≤ 300 KB.
  - Lưu vào IndexedDB, mốc 7 ngày tự đặt lại.
  - Xem dòng thời gian ảnh.
- **Nhật ký:** thêm hoặc xóa mục.
  - Các trường: ngày, loại, ghi chú.
  - Loại: Bón phân / Phun thuốc / Cắt tỉa / Sâu bệnh / Làm bông / Tưới / Ghi chú AI / Khác.
  - **[BS]** Loại *Phun thuốc* bắt buộc nhập **hoạt chất** và **PHI (ngày)**.
  - Xóa phải hỏi lại bằng Modal; xóa mềm (tombstone).
- **[BS] Dự báo** (khi có ngày xổ nhụy): bảng mốc theo mục 3.2.
- **[BS] Cảnh báo PHI:** nếu (ngày phun + PHI) > (xổ nhụy + 90) thì hiện "Không thu hoạch trước dd/mm/yyyy" ở hồ sơ cây và ở Tổng quan.
- **Copy Prompt gửi AI** (một chạm):
  - Gồm thông tin cây, cờ, ngày ảnh gần nhất, 10 mục nhật ký gần nhất, bối cảnh (Lộc Tấn – Đồng Nai, đất đỏ bazan, béc tưới gốc, mùa hiện tại).
  - Phần yêu cầu cho AI: chẩn đoán, mức tin cậy, cần chụp thêm gì, việc làm trong 7 ngày, hoạt chất theo nhóm FRAC/IRAC, PHI.

**Lô A:** trang riêng gồm thông tin lô, nhật ký và ảnh lô; dùng chung component nhật ký với Lô B.

### M3. Phân tích cắt tỉa
- Chọn cây, tick checklist 6 dấu hiệu, app tự tính mức (mục 3.6).
- 3 ô ảnh có hướng dẫn góc chụp (`kind`: `prune-overview`, `prune-under`, `prune-closeup`).
- Nút **"Lưu: Cần cắt tỉa"**:
  - Đặt `needsPruning = true`.
  - Tạo nhật ký loại *Cắt tỉa*, ghi chú là ảnh chụp lại checklist và mức đánh giá.
- Nút Copy Prompt cắt tỉa.
- Khung nhắc khi cắt (mục 3.6).

### M4. Tra cứu và máy tính
- **Phác đồ:** 6 thẻ phác đồ (mục 3.5), có ô tìm kiếm.
- **Máy tính Ri6:**
  - Chọn *mắt cua* hoặc *xổ nhụy* rồi nhập ngày.
  - Kết quả là bảng các mốc ở mục 3.2, mỗi mốc ghi khoảng ngày (từ – đến).
- **Máy tính béc tưới:**
  - Nhập L/cây cho Lô A (mặc định 30) và Lô B (mặc định 180).
  - Số cây mặc định 50 và 15, sửa được.
  - **[BS]** Số lần tưới/tuần (tùy chọn).
  - Kết quả: m³/lần cho từng lô và tổng; m³/tuần nếu có nhập số lần.
  - Ngoài khoảng ở mục 3.3 thì cảnh báo, không chặn.
  - Hiện quy tắc đặt béc.

### M5. Cài đặt [BS]
- Tên máy (ví dụ "Redmi K90 – Đạt") và `deviceId` (UUID tự sinh, chỉ đọc).
- Phần đồng bộ GitHub (mục 6):
  - Token, repo dữ liệu (mặc định `datnho0804-gif/Ri6-data`), nhánh (mặc định `main`).
  - Nút **Kiểm tra kết nối**.
  - Bật/tắt tự động đồng bộ.
- Gemini (tùy chọn):
  - API key và tên model (ô nhập, có giá trị mặc định sửa được).
  - Nút **Phân tích bằng Gemini** ở hồ sơ cây và ở màn cắt tỉa. Gửi prompt kèm tối đa 3 ảnh, hiện kết quả, có nút lưu thành nhật ký "Ghi chú AI".
- Sao lưu tay:
  - **Xuất JSON**, có tùy chọn kèm ảnh dạng base64.
  - **Nhập JSON**: hiện số bản ghi sẽ thêm hoặc cập nhật trước khi áp dụng. Dùng **chính hàm merge của mục 6**, không ghi đè.
  - **[BS]** Nhập được file sao lưu của app cũ (`legacy/index.html`): chỉ thông tin cây và nhật ký.

## 5. Mô hình dữ liệu (Dexie, `schemaVersion = 1`)

```ts
type ISODate = string;  // 'YYYY-MM-DD' (giờ VN)
type ISOTime = string;  // ISO 8601 UTC
interface SyncMeta { id: string; updatedAt: ISOTime; updatedBy: string /*deviceId*/; deletedAt?: ISOTime }
type Stage = 'kien-thiet'|'coi-dot'|'xiet-nuoc-lam-bong'|'mat-cua'|'xo-nhuy'|'nuoi-trai'|'thu-hoach'|'phuc-hoi';
interface Tree extends SyncMeta { /* id: 'SR01'..'SR15' */ lot: 'B'; label: string; location: string;
  ageYears: 3|4|5|null; stage: Stage|null; health: 'tot'|'theo-doi'|'benh'; needsPruning: boolean;
  diseaseWatch: boolean; budDate?: ISODate; flowerDate?: ISODate; note?: string }
interface Lot extends SyncMeta { /* id: 'LOT_A' */ treeCount: number; stage: Stage|null; note?: string }
type LogType = 'bon-phan'|'phun-thuoc'|'cat-tia'|'sau-benh'|'lam-bong'|'tuoi'|'ai'|'khac';
interface Log extends SyncMeta { targetId: string; date: ISODate; type: LogType; note: string;
  activeIngredient?: string; phiDays?: number }
type PhotoKind = 'weekly'|'prune-overview'|'prune-under'|'prune-closeup'|'disease';
interface Photo extends SyncMeta { targetId: string; takenAt: ISODate; kind: PhotoKind;
  width: number; height: number; bytes: number; remotePath?: string }   // blob ở bảng riêng photoBlobs
// Settings: chỉ lưu cục bộ, KHÔNG xuất JSON, KHÔNG đồng bộ:
interface Settings { deviceId; deviceName; githubToken?; dataRepo; dataBranch; autoSync;
  geminiApiKey?; geminiModel?; seasonOverride?: 'kho'|'mua'|null }
```
- Gọi `navigator.storage.persist()` khi khởi động.
- Bản ghi bị xóa vẫn giữ lại dưới dạng tombstone `deletedAt`, để không "sống lại" khi đồng bộ.

## 6. Đồng bộ tự động lên GitHub [BS]

**Repo dữ liệu.** `datnho0804-gif/Ri6-data`, **riêng tư**. Không dùng repo `Ri6`, vì `Ri6` công khai và mỗi commit dữ liệu sẽ chạy lại CI.

**Cấu trúc repo dữ liệu:**
```
data/state.json                         # { schemaVersion, trees[], lots[], logs[], photos[] (chỉ meta) }
photos/<targetId>/<YYYY-MM-DD>_<photoId>.jpg   # bất biến, không bao giờ sửa
```
`state.json` ghi thụt lề 2 dấu cách, mảng sắp xếp theo `id` để diff ổn định.

**Xác thực.** Fine-grained PAT, chỉ cấp cho repo `Ri6-data`, quyền **Contents: Read and write**. Nhập ở Cài đặt của từng máy.
- *Kiểm tra kết nối* gọi `GET /repos/{repo}`. Báo lỗi nếu `permissions.push` khác `true`. **Cảnh báo đỏ nếu repo không riêng tư.**

**Thuật toán `sync()`:**
1. Upload các ảnh chưa có `remotePath` bằng `PUT /contents/...`.
2. `GET data/state.json` để lấy nội dung và `sha`. Nếu 404 thì coi như rỗng.
   - Nếu nhận `encoding: "none"` (file > 1 MB) thì lấy nội dung qua Git Blobs API theo `sha`.
3. `merged = merge(local, remote)`:
   - Ghép theo `id` trong từng mảng.
   - Bản ghi có `updatedAt` mới hơn thì thắng. Nếu `updatedAt` bằng nhau thì `updatedBy` lớn hơn (so chuỗi) thắng.
   - Tombstone cũng là một bản ghi, áp dụng cùng quy tắc.
   - Hàm phải **lũy đẳng** và **giao hoán**.
4. Ghi `merged` vào IndexedDB.
5. Nếu `merged` khác remote thì `PUT` kèm `sha`, message `sync(<deviceName>): <n> thay đổi`.
6. Nếu nhận 409/422 do lệch `sha` thì làm lại từ bước 2, tối đa 3 lần, có backoff.
7. Ảnh có trong meta mà máy chưa có thì **chỉ tải khi mở xem**. Khi offline hiện ảnh thay thế.

**Lưu ý kỹ thuật.** Nội dung gửi lên phải mã hóa **base64 của UTF-8** (tiếng Việt có dấu). Không dùng `btoa()` trực tiếp trên chuỗi.

**Thời điểm đồng bộ:**
- Khi mở app.
- Khi app quay lại foreground.
- 30 giây sau thay đổi cuối cùng (debounce).
- Khi bấm nút **Đồng bộ ngay**.

Chỉ đồng bộ khi có mạng. Khi offline, thay đổi được xếp hàng chờ.

**Trạng thái trên header** (luôn nhìn thấy):
- "Đã đồng bộ HH:mm"
- "Chờ mạng (n thay đổi)"
- "Đang đồng bộ…"
- "Lỗi: token / quyền / mạng", bấm vào xem chi tiết.

## 7. Nền tảng và phát hành

| Dạng | Cấu hình |
|---|---|
| Web/PWA (Pages) | `base: '/Ri6/'`; `vite-plugin-pwa`; manifest: name "Sổ Tay Vườn Ri6", short_name "Ri6", `theme_color #14532d`, `background_color #faf8f5`, icon 192/512 + maskable; chạy offline sau lần tải đầu |
| APK (Capacitor) | `base: './'`; **không đăng ký Service Worker** khi `Capacitor.isNativePlatform()`; appId **`vn.loctan.sotayri6`** (cố định mãi mãi); appName "Sổ Tay Ri6" |

**CI/CD (GitHub Actions):**
- `ci.yml`: chạy khi `pull_request` và khi push nhánh `ag/**`. Các bước: `npm ci`, lint, typecheck, test, build.
- `deploy.yml`: push `main` → build → `actions/deploy-pages`.
- `android.yml`:
  - Khi push tag `v*.*.*`: build **APK release đã ký**, đính kèm vào GitHub Release với tên `SoTayRi6-vX.Y.Z.apk`.
  - Khi chạy tay (`workflow_dispatch`): build APK debug, lưu dạng artifact.
  - `versionCode = MAJOR*10000 + MINOR*100 + PATCH`.
  - Thiếu secrets ký thì job tag **báo lỗi rõ ràng**, không lặng lẽ xuất bản debug.

**Ký APK:**
- Dùng **một keystore duy nhất**, do chủ repo tạo trên máy mình và cất bản sao ngoài repo.
- 4 secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- *Mất keystore thì không cài bản cập nhật đè lên được. Phải gỡ app, và dữ liệu chưa đồng bộ trên máy sẽ mất.*

**Yêu cầu riêng cho Android:**
- Nút Back phần cứng: đóng modal trước, rồi về tab trước. Ở màn gốc thì bấm 2 lần mới thoát.
- Chừa vùng an toàn (tai thỏ), status bar màu `#14532d`.
- Chụp ảnh, copy clipboard và đồng bộ đều phải chạy được trong APK.
- `minSdk` theo mặc định của Capacitor.

## 8. Giao diện
- **Màu:**
  - Xanh sầu riêng `#14532d` (chính).
  - Đỏ bazan `#9a3412` (nhấn).
  - Nền `#faf8f5`, chữ `#1c1917`.
  - Trạng thái: xanh / vàng / đỏ (đỏ trạng thái phải khác đỏ bazan).
- **Bố cục:**
  - Điện thoại: thanh tab dưới (Tổng quan · Cây · Cắt tỉa · Tra cứu), Cài đặt ở header.
  - Máy tính: thanh điều hướng trên.
- Thao tác một tay; vùng bấm ≥ 48 px; tương phản cao để đọc được ngoài nắng.
- Không dùng `alert/confirm/prompt`; dùng Toast và Modal (có focus trap, đóng bằng Esc hoặc Back).
