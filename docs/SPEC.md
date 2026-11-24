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
2. Là **web app (PWA)** trên GitHub Pages: `https://datnho0804-gif.github.io/Ri6/`.
   - **Cài lên Android trực tiếp từ Google Chrome.** Chrome tạo một app thật (WebAPK): có icon ở màn hình chính và trong danh sách ứng dụng, mở toàn màn hình, chạy offline, tự cập nhật. Xem §7.0.
   - Dùng được trên trình duyệt máy tính.
   - *Bản APK riêng (§7 phần APK, §7.1, task A01–A02) đang **TẠM HOÃN** theo quyết định của chủ vườn ngày 24/11/2026. Chỉ làm khi được mở lại.*
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
- **[BS]** Khối **Hôm nay cần làm**: 5 việc ưu tiên nhất từ M6, kèm link "Xem tất cả".

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
  - **[BS]** Loại *Bón phân* bắt buộc chọn **loại phân**: Vôi/Dolomite · Hữu cơ/Trichoderma · Urê/đạm amoni · Lân · NPK · Khác. Trường này dùng cho nhắc khoảng cách bón vôi ở M6.
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
- Trợ lý AI (Gemini): xem M7.
- Nhắc nhở và thông báo: xem M6.
- Sao lưu tay:
  - **Xuất JSON**, có tùy chọn kèm ảnh dạng base64.
  - **Nhập JSON**: hiện số bản ghi sẽ thêm hoặc cập nhật trước khi áp dụng. Dùng **chính hàm merge của mục 6**, không ghi đè.
  - **[BS]** Nhập được file sao lưu của app cũ (`legacy/index.html`): chỉ thông tin cây và nhật ký.

### M6. Việc cần làm và nhắc nhở [BS]

Phần này chạy theo **quy tắc cố định**, hoạt động khi offline và **không phụ thuộc AI**.

Hàm thuần `buildAgenda(state, today)` trả về danh sách việc. Mỗi việc gồm `{ key, title, reason, targetId?, dueDate, priority: 'cao'|'vua'|'thap' }`. Danh sách gồm mọi việc quá hạn cộng các việc trong **7 ngày tới**.

| Nguồn | Quy tắc | `key` |
|---|---|---|
| Ảnh tuần | Cây ở trạng thái `due-soon` hoặc `overdue` (M1) | `photo:<treeId>` |
| Mốc Ri6 | Mốc của cây (theo §3.2, cần có `flowerDate` hoặc `budDate`) đang diễn ra hoặc bắt đầu trong 7 ngày | `ri6-<moc>:<treeId>` |
| PHI | Đang trong thời gian cách ly | `phi:<logId>` |
| Kiểm tra lại | Sau log *Phun thuốc* hoặc *Sâu bệnh*: kiểm tra lại ở ngày +7 và +14 (bước 5 phác đồ) | `recheck7:<logId>`, `recheck14:<logId>` |
| Khoảng cách vôi | Sau log *Bón phân* loại Vôi/Dolomite: không bón Hữu cơ/Trichoderma trước **+15 ngày**, không bón Urê/Lân trước **+10 ngày** (lấy cận trên của §3.3 cho an toàn) | `lime-gap:<logId>` |
| Mùa vụ | Tháng 5: "Bón vôi đầu mùa mưa". Tháng 10: "Bón vôi cuối mùa mưa". Tháng 11: "Kiểm tra béc, soi nhện đỏ đầu mùa khô" | `season:<ma>:<nam>` |
| Tự thêm hoặc do AI gợi ý | Lấy từ bảng `tasks` | `task:<id>` |

**Thao tác với từng việc:**
- **Xong**: lưu vào bảng `tasks` với `id = key`, `done = true`. Bảng này được đồng bộ, nên máy khác không nhắc lại.
- **Hoãn 1 ngày**: đặt `snoozeUntil`.
- **Thêm vào Google Calendar**.
- Việc ảnh tuần tự biến mất khi đã chụp ảnh, không cần bấm Xong.

**Cảnh báo khoảng cách vôi.** Khi thêm log vi phạm khoảng cách bón vôi thì hiện Modal cảnh báo, nhưng không chặn lưu.

**Giao diện.** Màn "Việc cần làm" chia 3 nhóm: Quá hạn / Hôm nay / 7 ngày tới. Có nút thêm việc tự tạo. Số việc hiện trên tab Tổng quan.

**Thông báo trên điện thoại (không cần server):**
- Có nút **"Bật nhắc nhở"**. Chỉ xin quyền Notification khi người dùng bấm nút này, không xin lúc mở app.
- Dùng Periodic Background Sync, tag `ri6-agenda`, `minInterval` 12 giờ.
  - Chỉ chạy khi app đã được cài từ Chrome.
  - Service Worker tính `buildAgenda` từ IndexedDB.
- Quy tắc báo, do hàm thuần `shouldNotify(...)` quyết định:
  - **tối đa 1 thông báo tổng hợp mỗi ngày**;
  - không báo trong **21:00–06:00** giờ VN;
  - chỉ báo khi có việc mới so với lần báo trước.
- Bấm vào thông báo thì mở màn Việc cần làm.
- **Giới hạn:** Chrome tự quyết tần suất của periodicsync, có thể thưa hơn 1 ngày. Vì vậy với mốc quan trọng (thu hoạch, PHI, bón vôi), app gợi ý **"Thêm vào Google Calendar"** để chắc chắn có chuông báo.
- **Link Google Calendar:**
  - Dạng `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…`.
  - Sự kiện cả ngày dùng `YYYYMMDD/YYYYMMDD`, ngày kết thúc **cộng 1** (exclusive).
  - Nút "Tạo nhắc chụp ảnh hằng tuần" thêm `recur=RRULE:FREQ=WEEKLY`. Cần thử thực tế; nếu không được thì hướng dẫn người dùng chọn "Lặp lại hằng tuần".

### M7. Trợ lý AI (Gemini) [BS]

Tính năng tùy chọn, cần Gemini API key (lấy miễn phí tại Google AI Studio). Khi chưa có key hoặc đang offline, mọi nút AI chuyển thành **Copy Prompt** để dán vào bất kỳ app AI nào.

**Cài đặt:**
- Ô API key dạng mật khẩu.
- Chọn model từ danh sách `GET /v1beta/models`: lọc các model hỗ trợ `generateContent`; mặc định chọn model "flash" mới nhất có trong danh sách. **Không hard-code tên model.**
- Nút Kiểm tra.
- Dòng ghi chú: *"Gói miễn phí: Google có thể dùng nội dung gửi lên để cải thiện dịch vụ."*

**Màn Hỏi AI** (nút nổi trên mọi màn):
- Hỏi đáp tự do, nhiều lượt, bằng tiếng Việt.
- Đính kèm tối đa 3 ảnh: chụp mới hoặc chọn từ ảnh của cây.
- Chọn cây đang hỏi (tùy chọn).
- Lịch sử hội thoại lưu cục bộ trong bảng `aiChats`, tối đa 50 hội thoại, **không đồng bộ**, xóa được.

**Nút "Phân tích bằng AI":**
- Ở hồ sơ cây: phân tích sức khỏe, sâu bệnh.
- Ở màn cắt tỉa: gửi 3 góc chụp kèm checklist.

**Ngữ cảnh tự gửi kèm** (hàm thuần `buildSystemPrompt`):
- Hồ sơ vườn (§2) và mùa hiện tại.
- Quy tắc nông học (§3), lấy **từ cùng hằng số** mà máy tính và thẻ phác đồ dùng.
- Nếu đã chọn cây: hồ sơ cây, 10 nhật ký gần nhất, các việc cần làm của cây đó.
- **Không bao giờ** chứa token hoặc API key.

**Yêu cầu trả lời** (system instruction):
- Trả lời bằng tiếng Việt, theo cấu trúc:
  1. Nhận định.
  2. Mức tin cậy (thấp / vừa / cao).
  3. Cần kiểm tra hoặc chụp thêm gì.
  4. Xử lý: canh tác và nước trước, thuốc sau.
  5. Hoạt chất theo nhóm FRAC/IRAC, ghi "theo nhãn". **Không** nêu liều hay tên thương mại.
  6. PHI.
  7. Khi nào cần mời cán bộ khuyến nông hoặc kỹ sư.
- Không chắc thì phải nói rõ.
- Nếu mâu thuẫn với quy tắc của app thì ưu tiên quy tắc app và chỉ ra chỗ mâu thuẫn.

**Đầu ra có cấu trúc:**
- Dùng `responseMimeType: application/json` với `responseSchema`:
  ```
  { answer: string (markdown), confidence: 'thap'|'vua'|'cao', actions: [{ title, dueInDays (0–60), targetId? }] }
  ```
- App hiện `answer`. Mỗi `action` có nút **"Thêm vào Việc cần làm"**, tạo bản ghi `tasks` với `source: 'ai'`.
- Hàm thuần `parseAiActions`:
  - loại action sai định dạng;
  - bỏ `targetId` không tồn tại;
  - kẹp `dueInDays` vào khoảng 0–60.

**Nút "Lưu vào nhật ký"** lưu kết quả thành log loại "Ghi chú AI", để kết quả được đồng bộ.

**Cảnh báo dưới mỗi câu trả lời** (luôn hiện): *"AI chỉ để tham khảo. Thuốc BVTV: dùng theo nhãn và Danh mục được phép tại VN; tuân thủ PHI."* Cảnh báo PHI của app vẫn luôn hiển thị; AI không ghi đè được.

**Xử lý lỗi.** Lỗi mạng, hết hạn mức (429) hay key sai đều hiện Toast rõ ràng và giữ nguyên câu hỏi để gửi lại.

**Kỹ thuật.** Gọi REST bằng `fetch`, không cần SDK. Ảnh gửi dạng inline base64, đã nén về cạnh dài ≤ 1280 px.

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
  activeIngredient?: string; phiDays?: number; fertilizerKind?: FertKind /* bắt buộc khi type = 'bon-phan' */ }
type FertKind = 'voi-dolomite'|'huu-co-trichoderma'|'dam-ure'|'lan'|'npk'|'khac';
interface Task extends SyncMeta { /* id = key quy tắc (khi Xong/Hoãn) hoặc UUID (việc tự thêm/AI) */
  title?: string; targetId?: string; dueDate?: ISODate; done: boolean; snoozeUntil?: ISODate;
  source: 'rule'|'manual'|'ai' }
type PhotoKind = 'weekly'|'prune-overview'|'prune-under'|'prune-closeup'|'disease';
interface Photo extends SyncMeta { targetId: string; takenAt: ISODate; kind: PhotoKind;
  width: number; height: number; bytes: number; remotePath?: string }   // blob ở bảng riêng photoBlobs
// Settings: lưu trong IndexedDB (bảng Dexie `settings`, KHÔNG dùng localStorage vì Service Worker không đọc được),
// chỉ lưu cục bộ, KHÔNG xuất JSON, KHÔNG đồng bộ:
interface Settings { deviceId; deviceName; githubToken?; dataRepo; dataBranch; autoSync;
  geminiApiKey?; geminiModel?; seasonOverride?: 'kho'|'mua'|null;
  notify?: { enabled: boolean; lastNotifiedAt?: ISOTime; lastKeys: string[] } }
// Bảng chỉ cục bộ, KHÔNG đồng bộ: aiChats (hội thoại AI, tối đa 50).
```
- Gọi `navigator.storage.persist()` khi khởi động.
- Bản ghi bị xóa vẫn giữ lại dưới dạng tombstone `deletedAt`, để không "sống lại" khi đồng bộ.

## 6. Đồng bộ tự động lên GitHub [BS]

**Repo dữ liệu.** `datnho0804-gif/Ri6-data`, **riêng tư**. Không dùng repo `Ri6`, vì `Ri6` công khai và mỗi commit dữ liệu sẽ chạy lại CI.

**Cấu trúc repo dữ liệu:**
```
data/state.json                         # { schemaVersion, trees[], lots[], logs[], tasks[], photos[] (chỉ meta) }
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

**[BS] Đồng bộ nền.** Ngoài vườn sóng chập chờn, người dùng thường ghi xong rồi tắt app.
- Nếu trình duyệt hỗ trợ Background Sync (Chrome Android có hỗ trợ): mỗi khi có thay đổi đang chờ thì đăng ký tag `ri6-sync`.
- Service Worker bắt sự kiện `sync` và chạy cùng mã `sync()`. Có mạng lại là dữ liệu tự đẩy lên, kể cả khi app đã đóng.
- Vì vậy mã đồng bộ trong `src/lib/sync/` **không được dùng** `window`, `document`, `localStorage`.
- Trình duyệt không hỗ trợ thì quay về các thời điểm đồng bộ nêu trên.

**[BS] Lưu ý bảo mật tên miền.**
- Mọi trang GitHub Pages của tài khoản `datnho0804-gif` đều chung một origin `datnho0804-gif.github.io`, nên **đọc được IndexedDB của nhau**, trong đó có token.
- Vì vậy không bật Pages cho repo nào khác của tài khoản này nếu repo đó chứa mã không tin cậy.
- Token chỉ có quyền trên `Ri6-data`, nên nếu lộ thì cũng chỉ ảnh hưởng dữ liệu vườn.
- App phải ghi một dòng cảnh báo ngắn về việc này ở màn Cài đặt, ngay cạnh ô token.

**Trạng thái trên header** (luôn nhìn thấy):
- "Đã đồng bộ HH:mm"
- "Chờ mạng (n thay đổi)"
- "Đang đồng bộ…"
- "Lỗi: token / quyền / mạng", bấm vào xem chi tiết.

## 7. Nền tảng và phát hành

### 7.0 Cài lên Android từ Chrome [BS — ưu tiên chính]

**Điều kiện cài được:**
- Manifest đủ trường: `name`, `short_name`, `start_url` và `scope` = `/Ri6/`, `display: standalone`, icon 192/512 + maskable.
- Có HTTPS (Pages có sẵn) và Service Worker.

**Nút "Cài app lên điện thoại"** (ở header hoặc trong Cài đặt):
- Bắt sự kiện `beforeinstallprompt`, khi bấm thì gọi `prompt()` của sự kiện đó. Đây là API của Chrome, không phải `window.prompt`.
- Ẩn nút khi đã chạy ở chế độ cài (`display-mode: standalone`).
- Không có sự kiện thì nút mở Modal hướng dẫn: Chrome → menu ⋮ → **"Thêm vào màn hình chính"** hoặc **"Cài đặt ứng dụng"**.
- **Mẹo cho Xiaomi/HyperOS:** nếu không thấy icon thì vào Cài đặt → Ứng dụng → Chrome → Quyền → bật **"Lối tắt màn hình chính"**.

**Bộ nhớ bền vững:**
- Gọi `navigator.storage.persist()`.
- Màn Cài đặt hiện trạng thái *Bộ nhớ bền vững: đã cấp / chưa* và dung lượng đã dùng (`navigator.storage.estimate()`).
- Chưa được cấp thì nhắc người dùng cài app ra màn hình chính và bật đồng bộ.

**Cảnh báo bắt buộc ở Cài đặt:** *"Gỡ app hoặc xóa dữ liệu trang của Chrome sẽ xóa dữ liệu trên máy này. Hãy bật đồng bộ GitHub để luôn có bản sao."*

**Tự cập nhật:** dùng `registerType: 'autoUpdate'`, kèm Toast "Đã cập nhật lên vX.Y.Z". Người dùng không cần bấm gì.

**Cài trên nhiều máy:**
- Mỗi máy mở link Pages bằng Chrome, cài app, rồi nhập token ở Cài đặt.
- Đồng bộ lần đầu sẽ kéo toàn bộ dữ liệu về.

> Từ đây đến hết §7.1: phần APK đang **TẠM HOÃN**. Chỉ `ci.yml` và `deploy.yml` là bắt buộc.

| Dạng | Cấu hình |
|---|---|
| Web/PWA (Pages) | `base: '/Ri6/'`; `vite-plugin-pwa`; manifest: name "Sổ Tay Vườn Ri6", short_name "Ri6", `theme_color #14532d`, `background_color #faf8f5`, icon 192/512 + maskable; chạy offline sau lần tải đầu |
| APK (Capacitor) | `base: './'`; **không đăng ký Service Worker** khi `Capacitor.isNativePlatform()`; appId **`vn.loctan.sotayri6`** (cố định mãi mãi); appName "Sổ Tay Ri6" |

**CI/CD (GitHub Actions):**
- `ci.yml`: chạy khi `pull_request` và khi push nhánh `ag/**`. Các bước: `npm ci`, lint, typecheck, test, build.
- `deploy.yml`: push `main` → build → `actions/deploy-pages`.
- `release.yml` **[BS] — phát hành tự động, không cần gắn tag tay:**
  - Chạy khi push vào `main` **và** `version` trong `package.json` lớn hơn tag `v*` mới nhất. Chạy tay (`workflow_dispatch`) thì build APK debug, lưu dạng artifact.
  - Workflow tự tạo tag `vX.Y.Z` và một GitHub Release (không phải prerelease). Release gồm 3 tệp:
    - `SoTayRi6-vX.Y.Z.apk`: APK release đã ký.
    - `ri6-web-X.Y.Z.zip`: gói web cho cập nhật OTA, là thư mục `dist` build với `base './'`.
    - `update.json`: theo mẫu ở §7.1.
  - `versionCode = MAJOR*10000 + MINOR*100 + PATCH`.
  - Thiếu secrets ký thì job **báo lỗi rõ ràng**, không lặng lẽ xuất bản debug.

**Ký APK:**
- Dùng **một keystore duy nhất**, do chủ repo tạo trên máy mình và cất bản sao ngoài repo.
- 4 secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- *Mất keystore thì không cài bản cập nhật đè lên được. Phải gỡ app, và dữ liệu chưa đồng bộ trên máy sẽ mất.*

**Yêu cầu riêng cho Android:**
- Nút Back phần cứng: đóng modal trước, rồi về tab trước. Ở màn gốc thì bấm 2 lần mới thoát.
- Chừa vùng an toàn (tai thỏ), status bar màu `#14532d`.
- Chụp ảnh, copy clipboard và đồng bộ đều phải chạy được trong APK.
- `minSdk` theo mặc định của Capacitor.

### 7.1 Tự động cập nhật [BS]

**Hai mức phiên bản** (khai báo trong `package.json`):
- `version` (semver): đổi với **mọi** bản phát hành.
- `ri6.nativeVersion` (số nguyên): **chỉ tăng** khi có thay đổi phần native, gồm:
  - bất kỳ file nào trong `android/`;
  - `capacitor.config.*`;
  - thêm, bớt hoặc nâng cấp `@capacitor/*` hay plugin native;
  - quyền Android.

  CI phải **báo lỗi** nếu diff chạm vào các đường dẫn native mà `nativeVersion` không tăng.

**Mẫu `update.json`:**
```json
{ "version": "1.3.0", "versionCode": 10300, "nativeVersion": 2, "notes": "…",
  "bundle": { "url": "https://github.com/datnho0804-gif/Ri6/releases/download/v1.3.0/ri6-web-1.3.0.zip", "sha256": "…" },
  "apk":    { "url": "https://github.com/datnho0804-gif/Ri6/releases/download/v1.3.0/SoTayRi6-v1.3.0.apk", "sha256": "…" } }
```
Địa chỉ cố định để kiểm tra (không tốn quota API):
`https://github.com/datnho0804-gif/Ri6/releases/latest/download/update.json`

**Hành vi trong APK.** Kiểm tra khi mở app và khi app quay lại foreground, tối đa 1 lần mỗi 6 giờ, chỉ khi có mạng.

1. **`update.nativeVersion > nativeVersion của APK đang cài` → cập nhật APK (bấm 1 lần):**
   - Hiện Modal "Có bản mới vX.Y.Z" kèm ghi chú phát hành.
   - App tự tải APK vào cache và **kiểm SHA-256**.
   - Cài bằng `PackageInstaller` session. Từ Android 12 trở lên đặt `setRequireUserAction(USER_ACTION_NOT_REQUIRED)` để cài im lặng khi hệ điều hành cho phép. Nếu không được thì hiện hộp thoại hệ thống và người dùng bấm "Cập nhật" 1 lần.
   - Chưa có quyền "Cài ứng dụng không rõ nguồn gốc" thì Modal giải thích, rồi mở đúng trang cài đặt quyền đó cho app.
   - Phần native là plugin Capacitor nội bộ, viết bằng Kotlin (`ApkUpdater`). Có thêm hàm `getNativeInfo() → { versionCode, nativeVersion }`, đọc từ `BuildConfig`.
2. **Ngược lại, nếu `update.version > phiên bản gói web đang chạy` → cập nhật OTA im lặng:**
   - Dùng `@capgo/capacitor-updater` ở **chế độ thủ công** (`autoUpdate: false`, tự host trên GitHub Releases, không dùng cloud Capgo).
   - Tải zip ngầm, kiểm SHA-256, rồi gọi `next()`: gói mới được áp dụng khi app vào nền hoặc khởi động lại.
   - Lần mở sau hiện Toast "Đã cập nhật lên vX.Y.Z".
   - Bật `resetWhenUpdate: true`, để khi cài APK mới thì quay về gói web gắn sẵn trong APK.
3. **An toàn:**
   - **Trước khi áp dụng bất kỳ cập nhật nào, chạy `sync()`** (nếu đã cấu hình), để dữ liệu nằm an toàn trên `Ri6-data`.
   - Gói web phải gọi `notifyAppReady()` sau khi mở DB thành công. Quá 10 giây chưa gọi thì tự quay về gói trước (rollback).
   - Schema Dexie chỉ được tăng. Bản cũ gặp DB mới (`VersionError`) thì hiện "Cần cập nhật ứng dụng", **không crash và không xóa DB**.
4. **Cài đặt:**
   - Hiện phiên bản: `version` của gói web, `versionCode` và `nativeVersion` của APK.
   - Công tắc **Tự động cập nhật** (mặc định bật).
   - Công tắc **Chỉ tải qua Wi-Fi** (mặc định tắt).
   - Nút **Kiểm tra cập nhật**.

**Bản web/PWA:** `vite-plugin-pwa` dùng `registerType: 'autoUpdate'`. Khi Service Worker mới kích hoạt thì hiện Toast "Đã cập nhật lên vX.Y.Z".

**Giới hạn cần biết:**
- App cài ngoài CH Play **không thể** tự cài APK mà chắc chắn không hỏi người dùng. HyperOS/MIUI có thể hiện thêm bước quét của hãng.
- Vì vậy thay đổi native phải dồn lại, càng hiếm càng tốt. Phần lớn bản phát hành chỉ nên là OTA.

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
