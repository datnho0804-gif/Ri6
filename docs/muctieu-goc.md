# YÊU CẦU XÂY DỰNG WEB APP / PWA: SỔ TAY QUẢN LÝ VƯỜN SẦU RIÊNG RI6 (LỘC TẤN, ĐỒNG NAI)

## 1. Vai trò & Mục tiêu
Hãy đóng vai Senior Frontend & PWA Engineer để xây dựng một ứng dụng web (PWA, chạy mượt trên điện thoại ngoài vườn và máy tính) phục vụ quản lý thực tế vườn sầu riêng **giống Ri6** tại **xã Lộc Tấn, tỉnh Đồng Nai** (khí hậu Đông Nam Bộ, **đất đỏ bazan**, sử dụng **hệ thống béc tưới gốc**), sẵn sàng deploy miễn phí lên **GitHub Pages**.

## 2. Tech Stack & Kiến trúc
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + Lucide React.
- **Lưu trữ Offline-First**: Dùng **IndexedDB** (lưu ảnh đã nén client-side không lo đầy dung lượng) kết hợp `localStorage` cho cấu hình; có tính năng **Export / Import JSON** để sao lưu và đồng bộ giữa các máy.
- **PWA**: Cấu hình `manifest.json` và Service Worker cơ bản để cài ra màn hình chính điện thoại ("Add to Home Screen") dùng được cả khi vườn yếu sóng.
- **Deploy GitHub**: Tự động tạo `README.md` và `.github/workflows/deploy.yml` để đẩy lên nhánh `main` là tự build và publish lên GitHub Pages.

## 3. Hồ sơ vườn & Dữ liệu nông học cốt lõi (Bắt buộc bám sát)
- **Quy mô 2 lô tách biệt** (không gộp chung phác đồ phân/nước):
  - **Lô A**: 50 cây Ri6 1 năm tuổi (kiến thiết cơ bản, chu kỳ cơi đọt 45–60 ngày, 1 thân thẳng, cành cấp 1 góc 70–90°, tủ gốc dày 10–20 cm cách gốc 10–20 cm).
  - **Lô B**: 15 cây Ri6 3–5 năm tuổi — **quản lý cá thể từng cây** theo mã `SR01` đến `SR15` (khởi tạo sạch, chưa có lịch sử giả để người dùng tự đặt tên vị trí và nạp ảnh gốc).
- **Đặc thù giống Ri6**:
  - Ra mắt cua → Xổ nhụy: 55–57 ngày.
  - Xổ nhụy → Lên cơm mạnh: 60–65 ngày (chuyển NPK giàu Kali như 12-11-18 từ ngày 55–65).
  - Xổ nhụy → Thu hoạch: 90–105 ngày (3–4 tuần cuối giảm đạm, giữ ẩm ổn định tránh sượng và cháy múi).
  - 30 ngày đầu sau xổ nhụy: chặn đọt non chặt, bổ sung Canxi-Bo, tưới nhấp 3–7 ngày đầu (1 ngày tưới – 1 ngày nghỉ tùy ẩm đất).
- **Quản lý đất đỏ bazan & béc tưới gốc**:
  - Duy trì pH đất 5.5–6.5; bón vôi/Dolomite đầu & cuối mùa mưa cách phân hữu cơ/Trichoderma tối thiểu 10–15 ngày.
  - Tuyệt đối không đặt béc phun thẳng vào cổ rễ/thân (tránh nấm *Phytophthora*).
  - Lô A (1 năm): 1 béc cách gốc 40–50 cm, bán kính 0.5–0.8 m, 20–40 lít/cây/lần.
  - Lô B (3–5 năm): 2–3 béc đối xứng cách gốc 1–1.5 m, mở bán kính phủ rìa tán, 150–200 lít/ngày khi nuôi trái, dùng van khóa riêng theo lô để xiết nước làm bông.

## 4. Các Module chức năng cần xây dựng
1. **Tổng quan & Nhắc lịch hàng tuần**:
   - KPI: Tổng 65 cây, số cây Lô B quá hạn chụp ảnh 7 ngày (hoặc chưa có ảnh gốc), số cây đang theo dõi bệnh/cắt tỉa, ngưỡng pH đất đỏ bazan (5.5–6.5).
   - Nút chuyển **Mùa khô (T11–T4)** / **Mùa mưa (T5–T10)** cập nhật khuyến cáo chăm sóc và phòng bệnh theo mùa.
   - Lưới 15 ô nhắc chụp ảnh tuần (`SR01`–`SR15`) đổi màu cảnh báo khi quá 7 ngày chưa chụp, bấm vào mở thẳng hồ sơ cây đó.
2. **Hồ sơ cá thể 15 cây (`SR01`–`SR15`) & Nhật ký Lô A (50 cây)**:
   - Tìm kiếm và lọc theo trạng thái (`Tất cả`, `Cần chụp tuần này`, `Cần cắt tỉa`, `Theo dõi sâu bệnh`).
   - Trong trang/modal chi tiết mỗi cây: đổi tên/vị trí (VD: `SR01 - Góc cổng`), tuổi (3/4/5 năm), giai đoạn sinh trưởng, trạng thái sức khỏe; chụp/tải ảnh hàng tuần (tự nén trước khi lưu vào IndexedDB và tự reset mốc 7 ngày); thêm/xóa nhật ký chăm sóc (ngày, loại: Bón phân / Phun thuốc / Cắt tỉa / Sâu bệnh / Làm bông, ghi chú).
   - Nút **1-chạm Copy Prompt gửi AI** (xuất tóm tắt hiện trạng + lịch sử gần nhất của cây để gửi cho AI chẩn đoán).
   - (Tùy chọn trong mục Cài đặt) Cho phép người dùng nhập **Gemini API Key** cục bộ trên trình duyệt để bấm phân tích ảnh sâu bệnh / cắt tỉa trực tiếp ngay trong app mà không cần backend.
3. **Phân tích nhánh, tán lá & Hướng dẫn 3 góc chụp cắt tỉa**:
   - Chọn cây cần kiểm tra + Checklist 6 dấu hiệu (chồi gốc ghép, cành thấp sát đất, cành vượt, cành tăm/khô trong lòng tán, cành đan chéo, tán lệch).
   - Tự động đánh giá mức độ cần cắt tỉa và hiển thị 3 ô tải ảnh hướng dẫn 3 góc chụp chuẩn:
     1. Toàn tán 2 hướng vuông góc (đứng cách mép tán 3–5 m).
     2. Ngước từ dưới gốc vào lòng tán (thấy rõ góc cành cấp 1 và cành tăm).
     3. Cận cảnh cụm cành nghi vấn (có buộc dây màu hoặc chỉ tay làm mốc).
   - Nút lưu trạng thái "Cần cắt tỉa" vào hồ sơ cây + nút Copy Prompt phân tích cắt tỉa; nhắc cắt ngày nắng ráo và quét keo liền sẹo/gốc đồng vết cắt lớn.
4. **Tra cứu phác đồ sâu bệnh (5 bước) & Máy tính Ri6 / Béc tưới**:
   - Phác đồ 5 bước (Nhận định → Kiểm tra tại vườn → Canh tác & béc tưới → Hoạt chất luân phiên → Theo dõi 7–14 ngày + nhắc PHI) cho: Xì mủ/thối rễ *Phytophthora*, Cháy lá *Rhizoctonia*/Nấm hồng, Rầy xanh, Nhện đỏ, Rụng trái non & Cháy múi Ri6.
   - **Máy tính Mốc sinh lý Ri6**: Chọn ngày ra mắt cua hoặc ngày xổ nhụy → xuất bảng lịch dự kiến từng giai đoạn đến ngày thu hoạch.
   - **Máy tính Béc tưới & Vật tư**: Nhập lít/cây cho Lô A (50 cây) và Lô B (15 cây) → tính tổng m³ nước/lần tưới và nhắc quy tắc đặt béc.

## 5. Yêu cầu thiết kế & Kiểm thử
- Giao diện tiếng Việt, tông màu xanh lá sầu riêng (`#14532d`) kết hợp đất đỏ bazan (`#9a3412`) trên nền sáng dịu (`#faf8f5`), độ tương phản cao dễ nhìn ngoài nắng, nút bấm đủ lớn cho thao tác một tay trên điện thoại.
- Không dùng `alert()`/`confirm()` mặc định của trình duyệt (dùng Toast/Modal).
- Sau khi code xong, chạy `npm run build` đảm bảo không lỗi TypeScript/Vite, rồi hướng dẫn ngắn gọn lệnh `git push` lên GitHub để kích hoạt GitHub Pages.
