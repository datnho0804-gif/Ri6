# AGENTS.md — Quy tắc cho tác tử lập trình (Antigravity)

Đọc file này TRƯỚC mỗi phiên làm việc. Trả lời và viết báo cáo bằng **tiếng Việt**.

## 1. Vai trò

| Ai | Làm gì |
|---|---|
| **Antigravity** | Lập trình viên: viết code, viết test, chạy kiểm tra, đẩy nhánh lên GitHub. |
| **Claude** | Giao việc và review. Sở hữu `AGENTS.md`, `docs/SPEC.md`, `docs/TASKS.md`. Đạt thì merge, chưa đạt thì ghi nhận xét trên PR. |
| **Chủ repo (anh Đạt)** | Quyết định cuối cùng. Tự làm các bước cần tài khoản: token, secrets, keystore, bật Pages. |

- Antigravity **không sửa** `AGENTS.md`, `docs/SPEC.md`, `docs/TASKS.md`, `docs/muctieu-goc.md`.
- Thấy yêu cầu sai, thiếu hoặc mâu thuẫn: ghi vào mục **"Câu hỏi cho reviewer"** trong báo cáo, chọn phương án an toàn nhất rồi làm tiếp. Không tự ý mở rộng phạm vi.

## 2. Quy trình mỗi task

1. `git checkout main && git pull`.
2. Đọc `docs/SPEC.md` và đúng một task trong `docs/TASKS.md`. Làm lần lượt **T01 → T06**, mỗi lần một task.
3. Tạo nhánh từ `main`: `ag/T0x-<ten-ngan>` (ví dụ `ag/T01-khung-du-an`).
4. Viết code. Trước **mỗi lần push**, các lệnh sau phải chạy xanh:
   ```bash
   npm ci && npm run lint && npm run typecheck && npm test && npm run build
   ```
5. Viết báo cáo `docs/reports/T0x.md` theo mẫu ở mục 4 và commit cùng nhánh.
6. `git push -u origin ag/T0x-...`. Máy có `gh` thì mở PR vào `main` với tiêu đề `[T0x] <tên task>`. Không có `gh` thì chỉ push, Claude sẽ tự mở PR.
7. Nhận xét review nằm trên trang PR: https://github.com/datnho0804-gif/Ri6/pulls (repo công khai, mở bằng trình duyệt là đọc được).
   Sửa trên **cùng nhánh**, push thêm commit và cập nhật báo cáo. Không mở PR mới.

**Cấm:** push thẳng vào `main`; tự merge; force-push nhánh đã có PR; xóa hoặc bỏ qua test để CI xanh; commit thư mục `node_modules`, `dist`, `android/app/build`.

## 3. Quy tắc kỹ thuật

- **Stack cố định:** Vite, React, TypeScript (`strict: true`), Tailwind CSS, `lucide-react`, Dexie (IndexedDB), `vite-plugin-pwa`, Vitest, ESLint. Capacitor chỉ thêm từ T05.
  Muốn thêm thư viện khác thì phải nêu lý do trong báo cáo.
- Dùng Node 20 LTS trở lên. Commit `package-lock.json`.
- **Phiên bản** (bắt buộc từ T05, xem SPEC §7.1). Mỗi PR có thay đổi app phải tăng `version` trong `package.json`:
  - sửa lỗi → tăng PATCH;
  - thêm tính năng → tăng MINOR.

  Thay đổi phần native phải tăng thêm `ri6.nativeVersion`. Merge vào `main` là tự phát hành, nên **không bao giờ** gắn tag hay tạo Release bằng tay.
- **Offline-first:** không tải gì từ CDN khi chạy (font, icon, CSS đều đóng gói vào bản build).
- Giao diện tiếng Việt. Tên biến, hàm, file tiếng Anh.
- **Cấm `alert()`, `confirm()`, `prompt()`** (ESLint `no-alert: "error"`). Dùng Toast và Modal của app.
- **Logic thuần** đặt trong `src/lib/`, không import React, phải có unit test Vitest. Gồm: tính mốc Ri6, tính nước béc tưới, mức cắt tỉa, trạng thái chụp ảnh, cảnh báo PHI, merge đồng bộ, mã hóa base64 UTF-8.
- **Ngày giờ:**
  - Ngày lưu dạng `YYYY-MM-DD` theo giờ `Asia/Ho_Chi_Minh`; mốc thời gian lưu ISO 8601 UTC.
  - Hiển thị `dd/mm/yyyy`.
  - Cộng ngày bằng hàm thuần có test. Không cộng mili-giây thô vì dễ lệch múi giờ.
- **Bảo mật:**
  - Không bao giờ commit GitHub token, Gemini API key, keystore (`*.jks`, `*.keystore`), `.env*` (đưa hết vào `.gitignore`).
  - Khóa chỉ nhập trong màn **Cài đặt** và chỉ lưu trên máy. Khóa **không** có trong file xuất JSON và **không** được đồng bộ lên repo.
- **Dữ liệu:**
  - SR01–SR15 và Lô A khởi tạo **trống**, không có lịch sử giả.
  - Không bịa liều lượng hay tên thương mại thuốc BVTV; chỉ ghi hoạt chất, nhóm cơ chế và chữ "theo nhãn".
- **Giao diện:**
  - Vùng bấm tối thiểu 48×48 px; chữ thân ≥ 16 px; tương phản ≥ 4,5:1.
  - Trạng thái phải có chữ hoặc icon đi kèm màu, không chỉ dùng màu.

## 4. Mẫu báo cáo `docs/reports/T0x.md`

```markdown
# Báo cáo T0x — <tên task>
## Tiêu chí nghiệm thu
- [x] AC1 … (file chính: src/…)
- [ ] AC2 … — CHƯA XONG vì …
## Lệnh đã chạy
npm ci / lint / typecheck / test (x passed) / build — kết quả
## Ảnh chụp màn hình
docs/reports/img/T0x-*.png (điện thoại 390×844 và máy tính 1280×800; PNG, mỗi ảnh < 300 KB)
## Thay đổi ngoài phạm vi / thư viện thêm
## Câu hỏi cho reviewer
```

## 5. Định nghĩa "Xong"

Một task chỉ được tính là xong khi đủ các điều sau:
- Mọi tiêu chí nghiệm thu (AC) của task đều được tick.
- CI xanh trên nhánh.
- Có báo cáo kèm ảnh chụp màn hình.
- Console trình duyệt không có lỗi.
- Không còn `TODO` cho các phần thuộc task.
