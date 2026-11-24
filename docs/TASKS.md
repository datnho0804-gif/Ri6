# DANH SÁCH TASK — giao cho Antigravity

- Làm theo thứ tự, mỗi task là một nhánh và một PR. Quy trình xem `AGENTS.md`; đặc tả xem `docs/SPEC.md`.
- Trạng thái do Claude cập nhật sau mỗi lần review.

| Task | Tên | Trạng thái |
|---|---|---|
| T01 | Khung dự án, PWA, CI/CD | ⏳ Chờ làm |
| T02 | Tổng quan, hồ sơ cây, nhật ký, sao lưu JSON | ⏳ |
| T03 | Cắt tỉa, tra cứu phác đồ, máy tính, cảnh báo PHI | ⏳ |
| T04 | Cài đặt, đồng bộ GitHub, Gemini | ⏳ |
| T05 | APK Android (Capacitor) và phát hành tự động | ⏸ Tạm hoãn — không làm |
| T06 | Tự động cập nhật trong app (OTA + APK) | ⏸ Tạm hoãn — không làm |

> Bản chính là web app cài từ Chrome (SPEC §7.0). T05–T06 giữ lại để tham khảo, chỉ làm khi Claude đổi trạng thái.

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
- Dexie schema v1 theo SPEC §5.
- Lần chạy đầu tạo SR01–SR15 và `LOT_A` **trống**, sinh `deviceId` (UUID).
- Gọi `navigator.storage.persist()`.

**AC7. PWA.**
- Manifest và icon theo SPEC §7.
- Tắt mạng rồi tải lại trang thì app vẫn mở được.
- Chrome Android cho phép "Thêm vào màn hình chính".
- Service Worker dùng `registerType: 'autoUpdate'`. Khi có bản mới thì hiện Toast "Đã cập nhật lên vX.Y.Z" (phiên bản lấy từ `package.json` lúc build).
- Có nút **"Cài app lên điện thoại"** theo SPEC §7.0, gồm cả nhánh `beforeinstallprompt` lẫn Modal hướng dẫn và mẹo cho Xiaomi.
- Báo cáo có ảnh app chạy toàn màn hình sau khi cài từ Chrome Android. Dùng máy thật hoặc emulator; nếu không có thì ghi rõ lý do.

**AC8. Đường dẫn gốc.**
- Build cho Pages dùng `base '/Ri6/'`. Có sẵn cơ chế (biến môi trường hoặc mode) để build `base './'` cho T05.

**AC9. Workflow.**
- Có `ci.yml` và `deploy.yml` theo SPEC §7. CI xanh trên nhánh `ag/T01-…`.

**AC10. Kiểm thử và báo cáo.**
- Ít nhất 1 unit test mẫu cho `src/lib/date.ts`: `addDays('2026-12-01', 55) === '2027-01-25'` và `addDays('2027-01-25', 90) === '2027-04-25'`.
- Báo cáo `docs/reports/T01.md` kèm ảnh chụp khung app trên điện thoại và máy tính.

> Việc của chủ repo sau khi T01 được merge: **Settings → Pages → Source: GitHub Actions**.

---

## T02 — Tổng quan, hồ sơ cây, nhật ký, sao lưu JSON
**Nhánh:** `ag/T02-tong-quan-ho-so`

**AC1. Màn Tổng quan (M1).**
- KPI, nút đổi mùa kèm khuyến cáo, lưới 15 ô có trạng thái chữ + màu. Bấm ô thì mở đúng hồ sơ cây.

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

**AC4. Hồ sơ cây.**
- Sửa được mọi trường theo SPEC M2.
- Ảnh tuần được nén (cạnh dài ≤ 1280 px). Test hàm tính kích thước: ảnh 4000×3000 → 1280×960.
- Có dòng thời gian ảnh.
- Lưu ảnh xong thì ô tương ứng ở Tổng quan chuyển sang "Đã chụp".

**AC5. Nhật ký.**
- Thêm và xóa mục nhật ký. Xóa phải hỏi lại bằng Modal, lưu tombstone.
- Loại *Phun thuốc* bắt buộc nhập hoạt chất và PHI.
- Trang Lô A dùng chung component nhật ký.

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

**AC5. Màn Tra cứu (M4).**
- 6 thẻ phác đồ × 5 bước theo SPEC §3.5, có tìm kiếm và dòng cảnh báo Danh mục thuốc / nhãn.
- Có máy tính Ri6 và máy tính béc tưới.

**AC6. Hàm `phiWarning(flowerDate, sprayLogs)`.**
- Xổ nhụy `2027-01-25` + phun `2027-04-10`, PHI 21 → cảnh báo "Không thu hoạch trước **01/05/2027**".
- Xổ nhụy `2027-01-25` + phun `2027-03-20`, PHI 14 → không cảnh báo.
- Cảnh báo hiện ở hồ sơ cây và ở KPI Tổng quan. Hồ sơ cây có ngày xổ nhụy thì hiện bảng dự báo.

**AC7. Báo cáo.**
- `docs/reports/T03.md` kèm ảnh màn cắt tỉa, một thẻ phác đồ và 2 máy tính.

---

## T04 — Cài đặt, đồng bộ GitHub, Gemini
**Nhánh:** `ag/T04-dong-bo-github`

> Chủ repo chuẩn bị trước:
> 1. Tạo repo **riêng tư** `Ri6-data`.
> 2. Tạo fine-grained PAT, chỉ cấp cho `Ri6-data`, quyền Contents: Read and write.
>
> Token **chỉ nhập trong app**, không đưa cho Antigravity, không ghi vào code.

**AC1. Màn Cài đặt (M5).**
- Có đủ các trường theo SPEC.
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

**AC6. Không lộ khóa.**
- Không có token hoặc khóa nào trong code, trong log console, hoặc trong commit gửi lên `Ri6-data`.

**AC7. Gemini.**
- Nút phân tích gửi prompt kèm tối đa 3 ảnh, hiện kết quả, lưu được thành nhật ký "Ghi chú AI".
- Có lỗi thì hiện bằng Toast.

**AC8. Đồng bộ nền và lưu Cài đặt.**
- Cài đặt lưu trong bảng Dexie `settings`, không dùng localStorage.
- Có Background Sync tag `ri6-sync` theo SPEC §6. Service Worker gọi được `sync()`; mã trong `src/lib/sync/` không dùng `window`, `document`, `localStorage`. CI có lệnh kiểm tra việc này, ví dụ grep hoặc rule ESLint.
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

## T05 — APK Android (Capacitor) và phát hành tự động
**Nhánh:** `ag/T05-apk-android`

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
- `docs/reports/T05.md` kèm ảnh app chạy trong APK.

---

## T06 — Tự động cập nhật trong app (OTA + APK)
**Nhánh:** `ag/T06-tu-dong-cap-nhat` (là thay đổi native, nên tăng `nativeVersion` lên 2)

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
- `docs/reports/T06.md` kèm ảnh Modal cập nhật, Toast sau OTA và màn Cài đặt phiên bản.
- Cập nhật `docs/ANDROID.md` với mục "Cập nhật tự động hoạt động thế nào".
