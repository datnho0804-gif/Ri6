# Sổ Tay Vườn Sầu Riêng Ri6 — Lộc Tấn, Đồng Nai

Web app quản lý vườn sầu riêng Ri6 trên đất đỏ bazan có hệ thống béc tưới gốc (15 cây 3–5 năm tuổi `SR01`–`SR15` và 50 cây 1 năm tuổi), xây dựng theo quy trình kỹ năng `cham-soc-sau-rieng`.

## Tính năng chính
- **Tổng quan & Nhắc chụp ảnh hàng tuần**: Tự động cảnh báo các cây chưa chụp ảnh hoặc quá 7 ngày, khuyến cáo theo mùa khô / mùa mưa Đông Nam Bộ.
- **Hồ sơ cá thể 15 cây 3–5 năm (`SR01`–`SR15`) & Lô 50 cây 1 năm**: Đặt tên/vị trí, tải ảnh kiểm tra tuần, ghi nhật ký bón phân/phun thuốc/cắt tỉa, lưu cục bộ trên trình duyệt (`localStorage`) và sao lưu/khôi phục JSON.
- **Phân tích cắt tỉa & 3 góc chụp chi tiết**: Checklist đánh giá tán lá và khung tải 3 góc chụp chuẩn (toàn tán 2 mặt, ngước lòng tán, cận cảnh cụm cành) kèm nút tạo prompt gửi AI.
- **Phác đồ sâu bệnh & Máy tính Ri6 / Béc tưới**: Tra cứu 5 bước xử lý *Phytophthora*, cháy lá, rầy xanh, nhện đỏ, cháy múi Ri6; tính mốc sinh lý Ri6 (mắt cua → xổ nhụy → lên cơm → thu hoạch) và tổng m³ nước béc tưới theo 2 lô.

## Cách đẩy lên GitHub Pages
```bash
git init
git add .
git commit -m "Khoi tao web app vuon sau rieng Ri6"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/vuon-sau-rieng-ri6.git
git push -u origin main
```
Sau đó vào **Settings → Pages → Source: Deploy from a branch (`main` / `/ (root)`)** để mở trực tiếp trên điện thoại ngoài vườn.
