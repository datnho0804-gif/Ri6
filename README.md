# Sổ Tay Vườn Sầu Riêng Ri6 — Lộc Tấn, Đồng Nai

Ứng dụng web (PWA) dùng ngoại tuyến ngoài vườn để quản lý vườn sầu riêng Ri6 trên đất đỏ bazan có béc tưới gốc, tự động đồng bộ 2 chiều giữa nhiều điện thoại và máy tính bảng qua repo GitHub riêng tư `Ri6-data`.

- **Địa chỉ ứng dụng:** https://datnho0804-gif.github.io/Ri6/
- **4 màn hình chính:**
  1. **Tổng quan:** KPI động toàn vườn, đổi mùa khô / mùa mưa Đông Nam Bộ, cảnh báo thời gian cách ly thuốc BVTV (PHI), lưới ảnh tuần từng cây, kéo xuống để đồng bộ ngay.
  2. **Cây:** Hồ sơ từng cây cá thể (mã, vị trí, tuổi, giai đoạn, sức khỏe, số trái đang mang, mốc mắt cua/xổ nhụy, dòng thời gian ảnh 1600 px WebP), hồ sơ Lô A kèm nút **Tách cây khỏi Lô A**, và **Ghi nhật ký đơn lẻ / hàng loạt**.
  3. **Cắt tỉa:** Đánh giá 6 dấu hiệu trên tán (cảnh báo cắt chồi gốc ghép ngay), 3 góc chụp chuẩn, lưu nhật ký cắt tỉa và Copy Prompt gửi AI.
  4. **Tra cứu:** 8 phác đồ sâu bệnh 5 bước (hoạt chất theo nhóm FRAC/IRAC, tìm kiếm không dấu), máy tính mốc sinh lý Ri6 và máy tính lượng nước béc tưới.
- **Lưu ý nền tảng:** Phiên bản cài trực tiếp từ **Google Chrome trên Android (WebAPK)** là bản chính thức (chạy toàn màn hình, dùng không cần mạng, tự cập nhật). Bản APK cài riêng hiện đang tạm hoãn.

---

## 1. Cài ứng dụng từ Chrome lên nhiều máy Android (kèm mẹo Xiaomi / HyperOS)

Thực hiện lần lượt trên điện thoại chính, điện thoại phụ và máy tính bảng dùng ngoài vườn:

1. Mở **Google Chrome** và truy cập địa chỉ: `https://datnho0804-gif.github.io/Ri6/`.
2. Chờ trang tải xong, vào biểu tượng **Cài đặt (⚙️)** ở góc trên bên phải → bấm **"Cài app lên điện thoại"**.
   - Nếu Chrome không hiện hộp thoại cài tự động, bấm nút menu **⋮** ở góc trên bên phải Chrome → chọn **"Cài đặt ứng dụng"** (hoặc **"Thêm vào màn hình chính"**).
3. Xác nhận **Cài đặt** để Chrome tạo biểu tượng **Ri6** ngoài màn hình chính và trong ngăn kéo ứng dụng.

> **Mẹo cho điện thoại Xiaomi / HyperOS / MIUI:**
> Nếu đã bấm cài đặt nhưng **không thấy biểu tượng Ri6 ngoài màn hình chính**, hãy mở:
> **Cài đặt máy → Ứng dụng → Quản lý ứng dụng → Chrome → Quyền khác → bật "Lối tắt màn hình chính"** (Home screen shortcuts), sau đó quay lại Chrome thực hiện thêm lại 1 lần.

> **Lưu ý an toàn dữ liệu trên Chrome:**
> Gỡ ứng dụng hoặc xóa dữ liệu trang của Chrome sẽ xóa bản dữ liệu lưu trên máy đó. Hãy thiết lập đồng bộ GitHub ở các bước dưới để luôn có bản sao an toàn trên mọi thiết bị.

---

## 2. Tạo repo dữ liệu riêng tư `Ri6-data` và Fine-grained Token (PAT)

Dữ liệu vườn (nhật ký, hồ sơ cây, ảnh cây) được lưu ở một repo **riêng tư tách biệt** khỏi repo mã nguồn công khai `Ri6`.

### Bước 2.1 — Tạo repo riêng tư `Ri6-data`
1. Đăng nhập GitHub, bấm dấu **+** ở góc trên phải → **New repository**.
2. Đặt tên repo là **`Ri6-data`**.
3. Ở mục quyền truy cập, **BẮT BUỘC chọn `Private` (Riêng tư)** để người lạ không xem được nhật ký và ảnh vườn.
4. Bấm **Create repository** (nên tích *Add a README file* hoặc tạo nhánh mặc định `main` sẵn).

### Bước 2.2 — Tạo Fine-grained Personal Access Token (PAT)
1. Vào GitHub → ảnh đại diện góc trên phải → **Settings** → kéo xuống cuối cột trái chọn **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Đặt tên token dễ nhớ (ví dụ: `Ri6-dong-bo-vuon`) và chọn thời hạn phù hợp (khuyến nghị 90 ngày – 1 năm và ghi lịch gia hạn).
3. Ở mục **Repository access**, chọn **Only select repositories** → chỉ tích chọn duy nhất repo **`Ri6-data`**.
4. Ở mục **Repository permissions**:
   - Tìm dòng **Contents** → chọn **`Read and write`**.
   - Giữ tất cả các quyền khác ở mức **`No access`**.
5. Bấm **Generate token** và sao chép ngay chuỗi token dạng `github_pat_...` để nhập vào ứng dụng.

> **Không bao giờ** chia sẻ token công khai, không gửi lên nhóm chat công cộng và không ghi vào mã nguồn.

---

## 3. Nhập token và kiểm tra kết nối trên từng máy

Làm lần lượt trên từng điện thoại / máy tính bảng cần đồng bộ:

1. Mở ứng dụng **Sổ Tay Vườn Ri6** → bấm biểu tượng **Cài đặt (⚙️)** → mục **Thiết bị & Đồng bộ GitHub**.
2. Điền thông tin:
   - **Tên thiết bị:** đặt tên phân biệt từng máy (ví dụ: `Điện thoại vườn 1`, `Máy tính bảng ở nhà`). Tên này sẽ hiện trong lịch sử commit của `Ri6-data`.
   - **Repo dữ liệu riêng tư:** nhập đúng dạng `chủ-tài-khoản/tên-repo` (ví dụ: `ten-ban/Ri6-data`, không dán cả đường dẫn `https://github.com/`).
   - **Nhánh:** mặc định `main`.
   - **GitHub Fine-grained Token (PAT):** dán mã `github_pat_...` vừa tạo (có nút con mắt để ẩn/hiện khi kiểm tra).
3. Bấm **"Kiểm tra kết nối"**:
   - **Khung xanh lá ("Kết nối hợp lệ"):** repo là **Private** và token có đủ quyền ghi — sẵn sàng đồng bộ.
   - **Cảnh báo đỏ repo công khai (Public):** vào GitHub → repo `Ri6-data` → *Settings → Danger Zone → Change repository visibility* chuyển ngay sang **Private** rồi kiểm tra lại.
   - **Cảnh báo đỏ thiếu quyền ghi (Push):** kiểm tra lại token đã cấp đúng **Contents: Read and write** cho repo `Ri6-data` chưa.
4. Bấm **"Lưu cài đặt"**, sau đó bấm **"Đồng bộ ngay"** để đẩy/kéo dữ liệu lần đầu.
5. Bật công tắc **"Tự động đồng bộ & đồng bộ nền"** (mặc định bật, tự lưu ngay khi gạt).

> **Lưu ý bảo mật miền dùng chung `*.github.io`:**
> Mọi trang GitHub Pages cùng một tài khoản dùng chung miền `*.github.io` và dùng chung bộ nhớ trình duyệt trên máy (bao gồm token lưu cục bộ). Không bật GitHub Pages cho repo chứa mã không tin cậy trên cùng tài khoản, và luôn giới hạn token chỉ có quyền ghi duy nhất vào repo riêng tư `Ri6-data`. Token không bao giờ xuất hiện trong tệp sao lưu JSON hay dữ liệu gửi lên `Ri6-data`.

---

## 4. Dữ liệu được đồng bộ khi nào & Đồng bộ nền (`ri6-sync`)

### 4 thời điểm tự đồng bộ
Khi đã lưu token, bật **Tự động đồng bộ** và máy có mạng, ứng dụng tự động đồng bộ 2 chiều vào 4 thời điểm:
1. **Khi mở ứng dụng.**
2. **Khi quay lại màn hình ứng dụng** (chuyển từ app khác quay lại).
3. **Sau 30 giây yên lặng** kể từ thay đổi dữ liệu cuối cùng (nhiều thao tác liên tiếp được gom lại thành 1 lần đẩy gọn).
4. **Chủ động ngay lập tức:** khi bấm nút **"Đồng bộ ngay"** (trong Cài đặt hoặc chạm trạng thái đám mây trên thanh tiêu đề) hoặc **kéo xuống ở đỉnh màn Tổng quan**.

### Đồng bộ nền ngoài vườn (Background Sync — `ri6-sync`)
- Khi đi ngoài vườn bị mất sóng, bạn vẫn ghi nhật ký, sửa hồ sơ và chụp ảnh bình thường — toàn bộ dữ liệu được lưu an toàn trên máy và xếp vào hàng chờ (`Chờ mạng`).
- Trên **Google Chrome Android**, ứng dụng tự đăng ký tác vụ nền **`ri6-sync`**. Ngay khi điện thoại có sóng trở lại, Service Worker sẽ tự động đẩy thay đổi lên `Ri6-data` **kể cả khi bạn đã đóng ứng dụng**.

### Cách gộp dữ liệu an toàn & Trạng thái trên thanh tiêu đề
- **Gộp thông minh từng bản ghi:** bản sửa có thời gian mới hơn thắng; thao tác xóa được lưu vết xóa (tombstone) để không bị "sống lại" khi đồng bộ từ máy cũ; 2 máy cùng offline thêm cây mới vẫn giữ đủ cả 2 cây (UUID riêng biệt) và gắn huy hiệu **"Trùng mã"** để chủ vườn đổi lại mà không mất dữ liệu.
- **Ảnh cây tiết kiệm 4G:** ảnh chụp mới được nén WebP 1600 px (≤ 350 KB) và tải lên 1 lần bất biến; trên máy khác ảnh chỉ tải về khi bạn mở xem hồ sơ cây, Lô A hoặc màn Cắt tỉa.
- **Theo dõi dung lượng:** ứng dụng hiện dung lượng repo `Ri6-data` trong Cài đặt và tự cảnh báo vàng khi vượt ngưỡng **800 MB**.
- **Trạng thái luôn hiện trên thanh tiêu đề (chạm vào để xem chi tiết):**
  - **Đã đồng bộ HH:mm** (xanh): dữ liệu đã khớp mới nhất.
  - **Đang đồng bộ…** (xanh dương): đang tải ảnh / gộp dữ liệu.
  - **Chờ mạng (n thay đổi)** / **Chờ đồng bộ (n)** (vàng): có thay đổi đang đợi có sóng hoặc đợi hết 30 giây gom nhóm.
  - **Lỗi: token / quyền / mạng** (đỏ): chạm vào để xem nguyên nhân cụ thể và thử lại.

---

## 5. Khôi phục dữ liệu khi đổi máy hoặc cài lại trình duyệt

### Cách 1 — Khôi phục từ GitHub (khuyến nghị, nhanh nhất)
1. Cài ứng dụng từ Chrome lên máy mới (Mục 1).
2. Vào **Cài đặt → Thiết bị & Đồng bộ GitHub**, nhập lại tên repo `Ri6-data`, nhánh `main` và Fine-grained Token (Mục 3).
3. Bấm **"Lưu cài đặt"** → **"Đồng bộ ngay"**. Toàn bộ hồ sơ cây, Lô A, nhật ký, danh sách việc và danh mục ảnh sẽ được kéo về máy ngay lập tức; ảnh chi tiết sẽ tự tải khi mở từng cây.

### Cách 2 — Khôi phục từ tệp sao lưu JSON ngoại tuyến
1. **Sao lưu trên máy cũ:** vào **Cài đặt → Sao lưu & Khôi phục thủ công (JSON)** → bật tùy chọn **"Kèm ảnh cây khi xuất tệp"** nếu muốn mang theo cả ảnh → bấm **"Xuất JSON"** và cất tệp `.json` vào thẻ nhớ / Google Drive cá nhân (tệp không bao giờ chứa token hay khóa API).
2. **Khôi phục trên máy mới:** mở **Cài đặt → Nhập JSON / bản cũ** (hỗ trợ cả tệp sao lưu của bản app cũ) → kiểm tra bảng xem trước số bản ghi thêm mới / cập nhật → bấm **"Áp dụng gộp dữ liệu"**.

---

## Dành cho phát triển (Node 20 LTS+)

```bash
npm ci
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
```
