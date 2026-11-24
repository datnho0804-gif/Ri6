# DANH SÁCH TASK — giao cho Antigravity

- Làm theo thứ tự, mỗi task là một nhánh và một PR. Quy trình xem `AGENTS.md`; đặc tả xem `docs/SPEC.md`.
- Trạng thái do Claude cập nhật sau mỗi lần review.
- Theo **SPEC 1.1**. Các AC đánh dấu **[1.1]** là phần mới thêm.

| Task | Tên | Trạng thái |
|---|---|---|
| T01 | Khung dự án, PWA, CI/CD | ✅ Đã merge (PR #7, 25/11) |
| **D01** | **Hệ thống thiết kế (`docs/DESIGN.md`) + trang `#/design`** | ✅ Đã duyệt (PR #10) |
| T02 | Tổng quan, hồ sơ cây, nhật ký, sao lưu JSON | ⏳ |
| T03 | Cắt tỉa, tra cứu phác đồ, máy tính, cảnh báo PHI | ⏳ |
| T04 | Cài đặt, đồng bộ GitHub | ⏳ |
| T05 | Việc cần làm và nhắc nhở | ⏳ |
| T06 | Trợ lý AI (Gemini) | ⏳ |
| A01 | APK Android (Capacitor) và phát hành tự động | ⏸ Tạm hoãn — không làm |
| A02 | Tự động cập nhật trong app (OTA + APK) | ⏸ Tạm hoãn — không làm |

> Bản chính là web app cài từ Chrome (SPEC §7.0). A01–A02 giữ lại để tham khảo, chỉ làm khi Claude đổi trạng thái.

---

## T01 — Khung dự án, PWA, CI/CD
**Nhánh:** `ag/T01-khung-du-an`

**AC1. Dọn app cũ.**
- `git mv index.html legacy/index.html`. Thư mục `legacy/` không nằm trong bản build.

**AC2. Khởi tạo dự án.**
- Vite + React + TS strict, Tailwind, `lucide-react`, Dexie, Vitest, ESLint (`no-alert: error`).
- Có đủ các script `dev`, `build`, `preview`, `lint`, `typecheck`, `test`.
- `.gitignore` gồm `node_modules`, `dist`, `.env*`, `*.jks`, `*.keystore`, `android/app/build`.

**AC3. Màu sắc.**
- Định nghĩa token màu theo SPEC §8 trong cấu hình Tailwind. Font hệ thống hoặc font đóng gói, **không dùng CDN**.

**AC4. Khung app.**
- Header có tên vườn và chỗ hiện trạng thái đồng bộ (tạm để trống).
- Điện thoại: thanh tab dưới 4 tab. Máy tính: thanh điều hướng trên.
- Có trang Cài đặt rỗng. Mỗi tab tạm thời là một màn placeholder.

**AC5. Toast và Modal.**
- Component dùng lại được. Modal có focus trap, đóng được bằng Esc.

**AC6. Cơ sở dữ liệu.**
- Dexie schema v1 theo SPEC §5, **bản 1.1**.
- **[1.1]** Schema đủ các trường mới:
  - `Tree.code`, `Tree.lot: 'A'|'B'`, `ageYears: number|null`, `fruitCount`, `fruitCountDate`, `fruitLimit`;
  - loại log `'do-ph'` với `soilPh`; trường `Log.batchId`;
  - `Settings.geminiSchemaUnsupported`.
- **[1.1]** Index tối thiểu:
  - `trees`: `id, code, lot`;
  - `logs`: `id, targetId, date, type, batchId`;
  - `tasks`: `id, targetId, dueDate`.
- **Không** lập index cho trường boolean (`needsPruning`, `diseaseWatch`, `done`...), vì IndexedDB không index được giá trị `true`/`false`. Các cờ này lọc trong bộ nhớ.
- Lần chạy đầu tạo SR01–SR15 (`id = code`) và `LOT_A` **trống**, sinh `deviceId` (UUID).
- **[1.1]** Số 15 và 50 chỉ nằm trong hằng số seed `INITIAL_INDIVIDUAL_TREES` và `INITIAL_LOT_A_COUNT`. Có test chứng minh seed **không chạy lại** khi DB đã có dữ liệu, kể cả khi đã thêm hoặc xóa cây.
- Gọi `navigator.storage.persist()`.

**AC7. PWA.**
- Manifest và icon theo SPEC §7.
- Tắt mạng rồi tải lại trang thì app vẫn mở được.
- Chrome Android cho phép "Thêm vào màn hình chính".
- Service Worker dùng `registerType: 'autoUpdate'`. Khi có bản mới thì hiện Toast "Đã cập nhật lên vX.Y.Z" (phiên bản lấy từ `package.json` lúc build).
- **[1.1] Service Worker tự viết.**
  - Dùng `strategies: 'injectManifest'` với `src/sw.ts` đúng SPEC §7.0: precache, `cleanupOutdatedCaches`, `NavigationRoute`, `skipWaiting`, `clientsClaim`. **Không** dùng `generateSW`.
  - Có `tsconfig.sw.json` (lib `WebWorker`) và `npm run typecheck` kiểm cả file này.
  - Báo cáo ghi kết quả thử offline và thử cập nhật: build bản A, mở app, build bản B (tăng `version` tạm thời, không commit), tải lại → Toast hiện "B".
- Có nút **"Cài app lên điện thoại"** theo SPEC §7.0, gồm cả nhánh `beforeinstallprompt` lẫn Modal hướng dẫn và mẹo cho Xiaomi.
- Báo cáo có ảnh app chạy toàn màn hình sau khi cài từ Chrome Android. Dùng máy thật hoặc emulator; nếu không có thì ghi rõ lý do.

**AC7b. Logo trái sầu riêng** (SPEC §8.1).
- Có `public/icons/logo.svg` và đủ bộ icon sinh từ file đó.
- Header dùng logo này.
- Manifest khai báo icon `purpose: "maskable"`.
- Báo cáo kèm ảnh: logo ở 512 px và 48 px; icon trên màn hình chính Android (hoặc ảnh xem trước trên maskable.app với mặt nạ tròn).

**AC8. Đường dẫn gốc.**
- Build cho Pages dùng `base '/Ri6/'`. Có sẵn cơ chế (biến môi trường hoặc mode) để build `base './'` cho APK sau này.

**AC9. Workflow.**
- Có `ci.yml` và `deploy.yml` theo SPEC §7. CI xanh trên nhánh `ag/T01-…`.

**AC10. Kiểm thử và báo cáo.**
- Ít nhất 1 unit test mẫu cho `src/lib/date.ts`: `addDays('2026-12-01', 55) === '2027-01-25'` và `addDays('2027-01-25', 90) === '2027-04-25'`.
- Báo cáo `docs/reports/T01.md` kèm ảnh chụp khung app trên điện thoại và máy tính.

> Việc của chủ repo sau khi T01 được merge: **Settings → Pages → Source: GitHub Actions**.

---

## D01 — Hệ thống thiết kế và trang `#/design`
**Nhánh:** `ag/D01-he-thong-thiet-ke`. Theo `docs/DESIGN.md`, hình mẫu `docs/design/mockup.jpg`.

**AC1. Token.**
- Đủ token màu, chữ, khoảng cách, bo góc, đổ bóng, chuyển động theo DESIGN §2, đặt trong `@theme` (CSS variables, tên theo vai trò).
- Không còn mã hex rời rạc trong `src/components/`.

**AC2. Font Be Vietnam Pro.**
- Tự host qua `@fontsource/be-vietnam-pro` (subset `vietnamese` + `latin`, độ đậm 400–700).
- Thử offline: font vẫn đúng, dấu tiếng Việt không vỡ.

**AC3. Đủ component trong DESIGN §4.**
- Mỗi component có đủ các trạng thái: thường, nhấn, focus, tắt, lỗi.
- BottomSheet:
  - kéo để đóng được;
  - có thanh hành động dính đáy, không bị bàn phím ảo che (dùng `visualViewport`);
  - **form đã có thay đổi thì hỏi trước khi bỏ**.
- Snackbar có nút "Hoàn tác".

**AC4. Trang `#/design?design=1`** bày toàn bộ component.
- Báo cáo có ảnh chụp trang này ở **DPR 3**, khổ 390 px.

**AC5. Làm lại khung app T01 theo DESIGN §3.**
- TopAppBar 64 px, có nút đồng bộ dạng icon với chấm màu (bỏ dòng trạng thái riêng).
- NavBar có chỉ báo dạng pill.
- NavRail cho màn ≥ 840 px.
- ExtendedFAB "Ghi nhật ký" (tạm thời mở BottomSheet mẫu).
- Không khóa xoay màn hình. Xoay ngang 844×390 thì header ≤ 15% chiều cao.

**AC6. Cảm giác app thật** theo DESIGN §6:
- `overscroll-behavior`, `tap-highlight`, `touch-action`;
- trạng thái nhấn; rung nhẹ (có công tắc trong Cài đặt);
- chuyển màn mượt; nút Back đóng sheet trước;
- `color-scheme: only light`;
- `prefers-reduced-motion`.

**AC7. Manifest** theo DESIGN §5:
- có `id`, `shortcuts` (3 mục), `screenshots` (3 dọc + 1 ngang, chụp từ app thật).
- Báo cáo có ảnh hộp cài đặt của Chrome, nếu có máy Android.

**AC8. Tự kiểm bằng checklist DESIGN §8.**
- Ghi số đo vào báo cáo: chữ nhỏ nhất, vùng bấm nhỏ nhất, axe, điểm Lighthouse.
- Có ảnh so sánh cạnh nhau với `mockup.jpg`.

**AC9. Báo cáo.**
- `docs/reports/D01.md`: ảnh ở DPR 3 cho các khổ 360/390/412 px, tablet 800×1280, máy tính 1280.

---

## T02 — Tổng quan, hồ sơ cây, nhật ký, sao lưu JSON
**Nhánh:** `ag/T02-tong-quan-ho-so`

**AC0. Chuyển tiếp từ QA D01 (PR #10).**
- Bỏ hết thuật ngữ kỹ thuật khỏi giao diện ("Dexie", "IndexedDB", "T02", "#/design"…). Viết bằng lời người dùng theo DESIGN §7.
- Liên kết tới `#/design` chỉ hiện khi đang ở `?design=1` hoặc khi chạy dev.
- Lazy-load `DesignShowcaseScreen` (`React.lazy`) để nó không nằm trong bundle chính.
- Lối tắt `#/photo` mở thẳng luồng **chụp ảnh tuần**. Đổi hash trong cùng trang thì đóng lớp nổi cũ, không để chồng lên nhau.
- Thêm `padding-bottom` cuối nội dung, khoảng FAB 56 + 16 px, để FAB không che mục cuối.
- Nâng các action trong workflow lên bản major chạy Node 24 (`checkout`, `setup-node`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`).

**AC1. Màn Tổng quan (M1).**
- KPI (tổng số cây **tính động [1.1]**), nút đổi mùa kèm khuyến cáo, lưới ô **cho mọi cây cá thể [1.1]** có trạng thái chữ + màu. Bấm ô thì mở đúng hồ sơ cây.

**AC2. Hàm `photoStatus(lastWeekly?: ISODate, today: ISODate)` trong `src/lib/`.**

Test với `today = '2026-11-24'`:

| Ảnh tuần gần nhất | Kết quả |
|---|---|
| không có | `overdue` |
| `2026-11-24` | `ok` |
| `2026-11-19` | `ok` |
| `2026-11-18` | `due-soon` |
| `2026-11-17` | `due-soon` |
| `2026-11-16` | `overdue` |

**AC3. Danh sách cây.**
- Tìm kiếm và 4 bộ lọc theo SPEC M2. Bộ lọc là hàm thuần, có test.
- **[1.1]** Nút "+ Thêm cây" theo SPEC M2. Test hàm `nextTreeCode(trees)`:

| Danh sách mã hiện có | Kết quả |
|---|---|
| SR01–SR15 | `SR16` |
| SR01–SR15 + SR16 đã xóa (tombstone) | `SR17` (không cấp lại mã đã xóa) |
| SR01, SR09, `Góc cổng` | `SR10` (bỏ qua mã không theo mẫu) |

- **[1.1]** Hai cây cùng `code` thì hiện huy hiệu "Trùng mã". Test hàm `duplicateCodes(trees)`.
- **[1.1]** Trang Lô A có nút "Tách cây khỏi Lô A" (SPEC M2).
  - Test: tách 3 cây từ `treeCount 50` → còn 47; tạo 3 cây `lot 'A'`; có 1 log lưu vết.
  - Tách 51 cây → bị từ chối.

**AC4. Hồ sơ cây.**
- Sửa được mọi trường theo SPEC M2, gồm **`code`, `fruitCount`, `fruitLimit` [1.1]**.
- Ảnh tuần được nén theo DESIGN §5. Test hàm tính kích thước:
  - ảnh 4000×3000 → bản đầy đủ 1600×1200 và thumbnail 480×360;
  - ảnh dọc 3000×4000 → 1200×1600 và 360×480.
- Có dòng thời gian ảnh.
- Lưu ảnh xong thì ô tương ứng ở Tổng quan chuyển sang "Đã chụp".

**AC5. Nhật ký.**
- Thêm và xóa mục nhật ký. Xóa một mục thì lưu tombstone và hiện Snackbar "Hoàn tác" (DESIGN §6). Bấm Hoàn tác thì mục trở lại nguyên vẹn (có test).
- Loại *Phun thuốc* bắt buộc nhập hoạt chất và PHI.
- Loại *Bón phân* bắt buộc chọn **loại phân** (`fertilizerKind`, SPEC §5).
- **[1.1]** Loại *Đo pH đất* bắt buộc nhập `soilPh` từ 3,0 đến 9,0. Nhập 2,5 hoặc 9,5 thì báo lỗi ngay trên form.
- Trang Lô A dùng chung component nhật ký.
- **[1.1] Ghi nhật ký hàng loạt** (SPEC M2).
  - Có các nút "Chọn tất cả Lô B" và "Kèm Lô A".
  - Giữ nguyên mọi ràng buộc bắt buộc như ghi đơn lẻ.
  - Cây vi phạm khoảng cách vôi gom vào 1 Modal, có lựa chọn "Vẫn lưu" và "Bỏ các cây vi phạm".
  - Có nút "Xóa cả đợt".
  - Test hàm `createBatchLogs`:
    - (a) 15 cây Lô B + Phun thuốc → 15 log cùng `batchId`, cùng hoạt chất và PHI.
    - (b) Thiếu PHI → trả lỗi, không tạo log nào.
    - (c) SR02 có log vôi ngày `2026-11-20`, bón Hữu cơ hàng loạt ngày `2026-11-28` cho SR01–SR03 → danh sách vi phạm chỉ có SR02.
    - (d) "Kèm Lô A" → có thêm 1 log `targetId 'LOT_A'`.

**AC6. Copy Prompt.**
- Nội dung đúng SPEC M2.
- Dùng `navigator.clipboard`; không được thì fallback, rồi hiện Toast "Đã copy".

**AC7. Xuất / nhập JSON.**
- Xuất có tùy chọn kèm ảnh.
- Nhập dùng hàm merge (tạm viết hàm LWW đơn giản theo SPEC §6 bước 3, có test; T04 dùng lại).
- Hiện xem trước số bản ghi trước khi áp dụng.
- **Test:** file xuất ra **không** chứa `githubToken` hoặc `geminiApiKey`.

**AC8. Nhập file sao lưu app cũ.**
- Nhập được thông tin cây và nhật ký từ file sao lưu của `legacy/index.html`.
- Nếu không làm được thì ghi lý do vào "Câu hỏi cho reviewer".

**AC9. Báo cáo.**
- `docs/reports/T02.md` kèm ảnh: Tổng quan, danh sách, hồ sơ cây, nhật ký (trên điện thoại).

---

## T03 — Cắt tỉa, tra cứu phác đồ, máy tính, cảnh báo PHI
**Nhánh:** `ag/T03-cat-tia-tra-cuu`

**AC1. Hàm `pruneLevel(signs: boolean[6])`.**
- 0 → `Không cần`; 1–2 → `Nhẹ`; 3–4 → `Vừa`; 5–6 → `Mạnh`.
- Tick chồi gốc ghép thì kèm cờ `removeSuckersNow`.

**AC2. Màn cắt tỉa (M3).**
- 3 ô ảnh kèm hướng dẫn, nút "Lưu: Cần cắt tỉa" (đặt cờ và tạo nhật ký), nút Copy Prompt cắt tỉa, khung nhắc cắt.

**AC3. Hàm `ri6Milestones(input: {kind: 'mat-cua'|'xo-nhuy', date})`.**

Test với **xổ nhụy `2027-01-25`**:

| Mốc | Kết quả |
|---|---|
| Tưới nhấp | đến `2027-01-28` → `2027-02-01` |
| Chặn đọt + Ca-Bo | đến `2027-02-24` |
| Chuyển Kali | `2027-03-21` → `2027-03-31` |
| Lên cơm | `2027-03-26` → `2027-03-31` |
| Giảm đạm | từ `2027-03-28` |
| **Thu hoạch** | **`2027-04-25` → `2027-05-10`** |

Test với **mắt cua `2026-12-01`**:

| Mốc | Kết quả |
|---|---|
| Xổ nhụy | `2027-01-25` → `2027-01-27` |
| **Thu hoạch** | **`2027-04-25` → `2027-05-12`** |

**AC4. Hàm `irrigation({aLiters, aCount, bLiters, bCount, perWeek?})`.**
- Với 30 / 50 / 180 / 15 / 3:
  - Lô A = **1,5 m³**, Lô B = **2,7 m³**, tổng = **4,2 m³/lần**, **12,6 m³/tuần**.
- Cảnh báo khi `aLiters = 45` (ngoài 20–40) và khi `bLiters = 120` (ngoài 150–200).
- Vẫn tính ra kết quả, không chặn.
- **[1.1]** Màn máy tính lấy số cây mặc định từ dữ liệu: `LOT_A.treeCount` và số cây cá thể, không hard-code 50/15.

**AC5. Màn Tra cứu (M4).**
- **8 thẻ phác đồ [1.1]** × 5 bước theo SPEC §3.5, có tìm kiếm và dòng cảnh báo Danh mục thuốc / nhãn.
- **[1.1]** Phác đồ 7 (Sâu đục trái & Rệp sáp) chia 2 mục con ở mỗi bước. Phác đồ 8 (Mọt đục cành / Xén tóc) có cách xử lý cơ giới: móc sâu non, bơm thuốc vào lỗ rồi bịt, cắt và tiêu hủy cành.
- Các hoạt chất đều kèm nhóm IRAC/FRAC, không có liều lượng hay tên thương mại.
- **Test:** dữ liệu phác đồ có đúng 8 mục, mỗi mục có đủ 5 bước không rỗng.
- Có máy tính Ri6 và máy tính béc tưới.

**AC6. Hàm `phiWarning(flowerDate, sprayLogs)`.**
- Xổ nhụy `2027-01-25` + phun `2027-04-10`, PHI 21 → cảnh báo "Không thu hoạch trước **01/05/2027**".
- Xổ nhụy `2027-01-25` + phun `2027-03-20`, PHI 14 → không cảnh báo.
- Cảnh báo hiện ở hồ sơ cây và ở KPI Tổng quan. Hồ sơ cây có ngày xổ nhụy thì hiện bảng dự báo.

**AC7. Báo cáo.**
- `docs/reports/T03.md` kèm ảnh màn cắt tỉa, một thẻ phác đồ và 2 máy tính.

---

## T04 — Cài đặt, đồng bộ GitHub
**Nhánh:** `ag/T04-dong-bo-github`

> Chủ repo chuẩn bị trước:
> 1. Tạo repo **riêng tư** `Ri6-data`.
> 2. Tạo fine-grained PAT, chỉ cấp cho `Ri6-data`, quyền Contents: Read and write.
>
> Token **chỉ nhập trong app**, không đưa cho Antigravity, không ghi vào code.

**AC1. Màn Cài đặt (M5).**
- Có các trường thiết bị và đồng bộ theo SPEC M5. Phần Gemini làm ở T06.
- Ô token dạng mật khẩu, có nút ẩn/hiện.
- Nút *Kiểm tra kết nối*:
  - Báo lỗi khi thiếu quyền push.
  - **Cảnh báo đỏ nếu repo công khai.**

**AC2. Đồng bộ.**
- `sync()` đúng thuật toán SPEC §6 (ảnh, `sha`, merge, ghi, retry khi 409/422, file > 1 MB).
- Đúng các thời điểm đồng bộ.
- Header hiện đủ các trạng thái.

**AC3. Test cho `merge()`.**
- Bản ghi mới hơn thắng.
- `updatedAt` bằng nhau thì xét `updatedBy`.
- Tombstone mới hơn thắng bản sửa cũ hơn.
- Hai bên thêm nhật ký khác nhau thì hợp được cả hai.
- `merge(a,a) == a` (lũy đẳng).
- `merge(a,b) == merge(b,a)` (giao hoán, so sau khi sắp xếp).

**AC4. Test base64 UTF-8.**
- Chuỗi `"Sầu riêng Ri6 – Lộc Tấn, Đồng Nai"` mã hóa rồi giải mã phải ra đúng như ban đầu.

**AC5. Kiểm thử thủ công với 2 trình duyệt hoặc 2 profile (giả lập 2 điện thoại).** Ghi kết quả vào báo cáo:
- (a) Máy 1 sửa SR01, máy 2 sửa SR02 → sau đồng bộ cả hai máy thấy cả hai thay đổi.
- (b) Cả hai cùng sửa SR03 → bản sửa sau thắng.
- (c) Máy 1 xóa một nhật ký trong khi máy 2 offline → máy 2 đồng bộ xong nhật ký đó vẫn bị xóa.
- (d) Ảnh chụp ở máy 1 hiện được ở máy 2.
- (e) **[1.1]** Cả hai máy offline, mỗi máy thêm 1 cây mới, cùng được gợi ý mã `SR16`. Sau đồng bộ có **2 cây riêng biệt** (hai UUID khác nhau), cả hai hiện huy hiệu "Trùng mã", không mất dữ liệu.
- (f) **[1.1]** Một đợt ghi nhật ký hàng loạt ở máy 1 hiện đủ trên máy 2. "Xóa cả đợt" ở máy 2 thì đồng bộ ngược lại máy 1.

**AC6. Không lộ khóa.**
- Không có token hoặc khóa nào trong code, trong log console, hoặc trong commit gửi lên `Ri6-data`.

**AC7. Gemini:** chuyển sang T06, không làm ở T04.

**AC7b. Đồng bộ bảng `tasks`.**
- `state.json` có mảng `tasks[]`, dùng chung hàm `merge()`.

**AC8. Đồng bộ nền và lưu Cài đặt.**
- Cài đặt lưu trong bảng Dexie `settings`, không dùng localStorage.
- Có Background Sync tag `ri6-sync` theo SPEC §6, đặt trong module `src/sw/sync.ts` và được `src/sw.ts` import. **[1.1]** Không sửa cấu hình PWA của T01. Service Worker gọi được `sync()`; mã trong `src/lib/sync/` không dùng `window`, `document`, `localStorage`. CI có lệnh kiểm tra việc này, ví dụ grep hoặc rule ESLint.
- **Thử thủ công:** bật chế độ máy bay → thêm nhật ký → đóng app → tắt chế độ máy bay → sau ít phút commit mới xuất hiện trong `Ri6-data` mà không cần mở app.

**AC9. Bộ nhớ và cảnh báo trong Cài đặt** (SPEC §7.0 và §6).
- Hiện trạng thái bộ nhớ bền vững và dung lượng đã dùng.
- Có cảnh báo "xóa dữ liệu Chrome sẽ mất dữ liệu trên máy".
- Có cảnh báo về origin chung `*.github.io` đặt cạnh ô token.

**AC10. README hướng dẫn chủ vườn** (tiếng Việt).
- Cài app từ Chrome lên nhiều máy Android, kèm mẹo cho Xiaomi.
- Tạo repo riêng tư `Ri6-data` và fine-grained token.
- Nhập token trên từng máy.
- Dữ liệu được đồng bộ khi nào.
- Khôi phục dữ liệu khi đổi máy.

**AC11. Báo cáo.**
- `docs/reports/T04.md` kèm ảnh: Cài đặt, các trạng thái đồng bộ, và một commit mẫu trong `Ri6-data` (che token).

---

## T05 — Việc cần làm và nhắc nhở
**Nhánh:** `ag/T05-viec-can-lam` (SPEC M6)

**AC1. Hàm `buildAgenda(state, today)`.** Test với `today = '2026-11-24'`, tầm nhìn 7 ngày:

| Dữ liệu | Kết quả mong đợi |
|---|---|
| SR01 `flowerDate 2026-09-26` (đang ở ngày 59) | có `ri6-kali:SR01` (đang diễn ra, đến 30/11), `ri6-len-com:SR01` (bắt đầu `2026-11-25`), `ri6-giam-dam:SR01` (`2026-11-27`) |
| SR02 ảnh tuần gần nhất `2026-11-16` | có `photo:SR02`, ưu tiên `cao` |
| Log *Phun thuốc* SR03 ngày `2026-11-20` | có `recheck7:<id>` hạn `2026-11-27`; **không** có `recheck14` (hạn `2026-12-04` nằm ngoài 7 ngày) |
| Log *Bón phân* Vôi/Dolomite LOT_A ngày `2026-11-20` | có `lime-gap:<id>` với nội dung "Không bón Hữu cơ/Trichoderma trước 05/12/2026; không bón Urê/Lân trước 30/11/2026" |
| Đổi `today` thành `2026-05-03` / `2026-10-10` | có `season:voi-dau-mua-mua:2026` / `season:voi-cuoi-mua-mua:2026` |
| Có bản ghi `tasks` `done = true`, hoặc `snoozeUntil` > today | việc đó **không** xuất hiện |
| **[1.1]** SR04 đo pH `5.1` ngày `2026-11-10`, chưa bón vôi | có `ph-low:SR04`, ưu tiên `cao` |
| **[1.1]** Như trên, thêm log Vôi/Dolomite SR04 ngày `2026-11-15` | **không** có `ph-low:SR04` |
| **[1.1]** Như trên nhưng log vôi ngày `2026-11-10` (cùng ngày đo) | **không** có `ph-low:SR04` |
| **[1.1]** Như trên nhưng log vôi ngày `2026-11-05` (trước ngày đo) | **có** `ph-low:SR04` |
| **[1.1]** SR05 đo `5.0` ngày `2026-10-01`, sau đó đo `5.9` ngày `2026-11-01` | **không** có `ph-low:SR05` (chỉ xét lần đo gần nhất) |
| **[1.1]** LOT_A đo pH `6.9` | có `ph-high:LOT_A`, ưu tiên `vua` |
| **[1.1]** SR06 `fruitCount 48`, `fruitLimit 40` / chưa đặt `fruitLimit` | có `fruit-over:SR06` / không có |
| **[1.1]** 1 đợt phun hàng loạt 15 cây ngày `2026-11-20` | đúng **1** việc `recheck7:batch:<batchId>` "(15 cây)", không phải 15 việc |

**AC2. Màn Việc cần làm.**
- Chia 3 nhóm: Quá hạn / Hôm nay / 7 ngày tới.
- Mỗi việc có nút Xong / Hoãn 1 ngày / Thêm vào Google Calendar.
- Thêm được việc tự tạo.
- Tổng quan có khối "Hôm nay cần làm" (5 việc) và số việc hiện trên tab.
- Bảng `tasks` được đồng bộ (T04 AC7b).

**AC3. Cảnh báo khoảng cách vôi.**
- Có log vôi LOT_A ngày `2026-11-20`, sau đó thêm log Hữu cơ/Trichoderma cho LOT_A ngày `2026-11-28` → hiện Modal cảnh báo, vẫn cho lưu.

**AC4. Hàm `calendarUrl(item)`.**
- "Thu hoạch SR01", sự kiện cả ngày từ `2027-04-25` đến `2027-05-10` → URL chứa `dates=20270425/20270511`.
- Tiêu đề và mô tả tiếng Việt được mã hóa URL đúng.
- Nút "Tạo nhắc chụp ảnh hằng tuần" dùng `recur=RRULE:FREQ=WEEKLY`. Ghi kết quả thử thực tế vào báo cáo.

**AC5. Thông báo.**
- Nút "Bật nhắc nhở" mới xin quyền.
- Đăng ký periodicsync `ri6-agenda` nếu trình duyệt hỗ trợ.
- Service Worker dùng `buildAgenda`; mã không dùng `window`, `document`, `localStorage`.
- **[1.1]** Xử lý `periodicsync` nằm trong `src/sw/agenda.ts`, `notificationclick` nằm trong `src/sw/notification.ts`, cả hai được `src/sw.ts` import. Không sửa cấu hình PWA của T01.
- Test `shouldNotify`:

| Tình huống (giờ VN) | Kết quả |
|---|---|
| 22:00 hoặc 05:59 | `false` (giờ yên lặng) |
| 07:00, lần báo trước là 07:00 hôm qua, có key mới | `true` |
| Đã báo một lần trong cùng ngày | `false` |
| Không có key mới | `false` |

**AC6. Màn Cài đặt.**
- Hiện quyền thông báo, periodicsync có được hỗ trợ không, lần báo gần nhất.
- Có nút "Gửi thông báo thử".

**AC7. Báo cáo.**
- `docs/reports/T05.md` kèm ảnh: màn Việc cần làm, khối Hôm nay, thông báo thật trên Android (nếu làm được), sự kiện đã tạo trong Google Calendar.

---

## T06 — Trợ lý AI (Gemini)
**Nhánh:** `ag/T06-tro-ly-ai` (SPEC M7)

**AC1. Cài đặt Gemini** theo SPEC M7.
- Key có nút ẩn/hiện; model chọn từ API; có nút Kiểm tra; có ghi chú về gói miễn phí.
- **[1.1]** Test hàm `filterChatModels` với danh sách giả lập:
  - **Giữ** `gemini-x-flash`, `gemini-x-pro`, `gemini-x-flash-lite`.
  - **Loại** `gemini-x-flash-preview-tts`, `gemini-x-flash-native-audio`, `gemini-embedding-001`, `gemini-x-flash-image`, `gemini-x-flash-live`, `imagen-4`, cùng các model không có `generateContent`.
  - **Mặc định chọn** `gemini-x-flash`: ổn định, ưu tiên hơn bản `-preview` cùng phiên bản.
- **Test:** key không xuất hiện trong file xuất JSON, trong dữ liệu đồng bộ và trong console.

**AC2. Hàm `buildSystemPrompt`.** Test:
- Chuỗi trả về chứa "Lộc Tấn", "đất đỏ bazan", tên mùa, "5,5–6,5", "90–105".
- Khi chọn SR01: có label của SR01 và **tối đa 10** log mới nhất, sắp xếp mới → cũ.
- **Không** chứa chuỗi token/key giả đã đặt sẵn trong settings của test.
- Quy tắc nông học được import từ `src/lib/agronomy.ts`, không chép tay.

**AC3. Hàm `parseAiActions`.** Test:

| Đầu vào | Kết quả |
|---|---|
| Action thiếu `title` | bị loại |
| `dueInDays: 99` | thành 60 |
| `dueInDays: -3` | thành 0 |
| `targetId: 'SR99'` | bỏ `targetId`, giữ action |
| JSON hỏng | trả `[]`, vẫn hiện `answer` dạng chữ nếu có |

**AC4. Màn Hỏi AI.**
- Hỏi đáp nhiều lượt, đính kèm tối đa 3 ảnh (đã nén), chọn cây.
- Lịch sử lưu cục bộ, tối đa 50 hội thoại, xóa được.

**AC5. Nút "Phân tích bằng AI".**
- Có ở hồ sơ cây và màn cắt tỉa.
- Mỗi action có nút "Thêm vào Việc cần làm": tạo bản ghi `tasks` với `source 'ai'`, hiện ở màn Việc cần làm của T05.
- Có nút "Lưu vào nhật ký".

**AC6. Cảnh báo.**
- Dòng cảnh báo tham khảo/thuốc BVTV hiện dưới mỗi câu trả lời.
- Cảnh báo PHI của app vẫn hiện độc lập với AI.

**AC7. Xử lý lỗi.**
- Offline hoặc chưa có key: các nút AI thành Copy Prompt.
- Lỗi 401, 429 hoặc lỗi mạng: hiện Toast, không mất câu hỏi.
- **[1.1] Fallback schema** (SPEC M7). Test bằng `fetch` giả lập:
  - (a) Lần 1 trả 400 → lần 2 gửi request **không có** `responseSchema` và `responseMimeType` → hiện câu trả lời, `actions = []`, tên model được ghi vào `geminiSchemaUnsupported`.
  - (b) Lần gọi sau với model đó: chỉ **1** request, không kèm schema.
  - (c) Trả 429 hoặc 401 → **không** fallback, hiện Toast.

**AC8. Thử thật** bằng key của người làm (không commit key). Dán câu trả lời rút gọn vào báo cáo cho 3 trường hợp:
- 1 câu hỏi chữ;
- 1 câu hỏi kèm ảnh lá;
- 1 lần phân tích cắt tỉa.

**AC9. Báo cáo.**
- `docs/reports/T06.md` kèm ảnh: màn Hỏi AI, kết quả phân tích, action đã được thêm vào Việc cần làm.

---

## A01 — APK Android (Capacitor) và phát hành tự động ⏸ TẠM HOÃN
**Nhánh:** `ag/A01-apk-android`

**AC1. Cấu hình Capacitor.**
- appId `vn.loctan.sotayri6`, appName "Sổ Tay Ri6".
- Icon và splash lấy từ icon PWA.
- Bản native build với `base './'` và không có Service Worker.

**AC2. Hành vi Android.**
- Nút Back phần cứng, vùng an toàn và màu status bar theo SPEC §7.
- Chụp ảnh, clipboard, đồng bộ GitHub và Gemini đều chạy được trong APK.

**AC3. Workflow `release.yml`.**
- Đúng SPEC §7: merge vào `main` mà `version` tăng thì tự tạo tag và Release gồm APK đã ký, `ri6-web-X.Y.Z.zip` và `update.json` (đúng mẫu §7.1, có SHA-256 thật).
- Merge mà `version` không tăng thì **không** phát hành.
- Chạy tay → APK debug dạng artifact.
- Có `versionCode` theo công thức. Thiếu secrets thì báo lỗi rõ ràng.
- `package.json` có `ri6.nativeVersion = 1`.
- `ci.yml` báo lỗi khi diff chạm vào đường dẫn native mà `nativeVersion` không tăng. Kèm test hoặc script chứng minh.

**AC4. Hướng dẫn `docs/ANDROID.md`** (tiếng Việt, cho chủ repo dùng Windows):
- Tạo keystore bằng `keytool`.
- Mã hóa base64 bằng PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("ri6-release.jks"))`.
- Thêm 4 secrets vào repo.
- Phát hành: tăng `version` rồi merge vào `main` là workflow tự làm, không gắn tag tay.
- Cài APK lên nhiều máy Android (bật "Cài ứng dụng không rõ nguồn gốc").
- Cách cập nhật phiên bản.
- **Cảnh báo cất 2 bản sao keystore ngoài repo.**

**AC5. Thử cập nhật đè.**
- Cài v1.0.0, nhập dữ liệu, rồi cài v1.0.1 đè lên → **dữ liệu còn nguyên**. Ghi kết quả vào báo cáo.
- Làm trên máy thật hoặc emulator.

**AC6. README.**
- Cập nhật `README.md`: giới thiệu, link Pages, link tải APK mới nhất, sơ đồ đồng bộ, lệnh dev.

**AC7. Báo cáo.**
- `docs/reports/A01.md` kèm ảnh app chạy trong APK.

---

## A02 — Tự động cập nhật trong app (OTA + APK) ⏸ TẠM HOÃN
**Nhánh:** `ag/A02-tu-dong-cap-nhat` (là thay đổi native, nên tăng `nativeVersion` lên 2)

**AC1. Hàm thuần `decideUpdate(installed, current, manifest)`.**
- Trả về `'apk' | 'ota' | 'none'` theo SPEC §7.1, so sánh semver đúng (`1.10.0 > 1.9.9`).
- Test các trường hợp sau, với `installed.nativeVersion = 2` và `current = 1.2.0`:

| `manifest.nativeVersion` | `manifest.version` | Kết quả |
|---|---|---|
| 3 | 1.3.0 | `apk` |
| 2 | 1.3.0 | `ota` |
| 2 | 1.2.0 | `none` |
| 1 | 1.3.0 | `ota` |

**AC2. Cập nhật OTA.**
- `@capgo/capacitor-updater` chế độ thủ công: tải ngầm, kiểm SHA-256, gọi `next()`, có Toast sau khi áp dụng.
- Có `notifyAppReady()` và rollback sau 10 giây.
- **Test rollback:** phát hành một gói cố ý không gọi `notifyAppReady()` → app tự quay về gói trước và dữ liệu còn nguyên.

**AC3. Cập nhật APK.**
- Plugin Kotlin `ApkUpdater`: tải, kiểm SHA-256 (sai thì xóa file và báo lỗi), cài bằng `PackageInstaller`.
- Từ Android 12 trở lên có thử `USER_ACTION_NOT_REQUIRED`.
- Có luồng xin quyền "Cài ứng dụng không rõ nguồn gốc".
- Có `getNativeInfo()`.

**AC4. An toàn dữ liệu.**
- Chạy `sync()` trước khi áp dụng cập nhật.
- Gặp `VersionError` thì hiện thông báo, không crash và không xóa DB.

**AC5. Cài đặt.**
- Hiện các phiên bản, 2 công tắc và nút Kiểm tra cập nhật (SPEC §7.1 mục 4).
- Tần suất kiểm tra tối đa 1 lần mỗi 6 giờ (có test).

**AC6. Kiểm thử thật trên máy hoặc emulator.** Ghi kết quả vào báo cáo:
- (a) Cài v1.x đang chạy → merge một PR chỉ sửa giao diện → app **tự cập nhật OTA** mà không bấm gì.
- (b) Merge một PR tăng `nativeVersion` → app hiện Modal → bấm 1 lần → cài đè → **dữ liệu còn nguyên**.
- (c) Đang offline thì không báo lỗi; có mạng lại thì kiểm tra cập nhật.

**AC7. Báo cáo.**
- `docs/reports/A02.md` kèm ảnh Modal cập nhật, Toast sau OTA và màn Cài đặt phiên bản.
- Cập nhật `docs/ANDROID.md` với mục "Cập nhật tự động hoạt động thế nào".
