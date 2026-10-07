# HƯỚNG DẪN CHI TIẾT DEPLOY DỰ ÁN LÊN VERCEL

- **Frontend**: https://btl-khaipha.vercel.app
- **Backend**: https://btl-khaipha-sced.vercel.app

Dự án gồm 2 phần:
* **Frontend**: Next.js (App Router)
* **Backend**: Node.js / ExpressJS + MongoDB Atlas + Cloudinary + Nodemailer

Hệ thống đã được tối ưu sẵn các tệp cấu hình:
- `.gitignore` (bảo vệ mã nguồn, chống lộ file `.env` và tránh đẩy `node_modules`)
- `backend/vercel.json` (cấu hình Serverless Function cho Express trên Vercel)
- `frontend/next.config.js` (cấu hình định tuyến và dynamic API proxy)
- `backend/index.js` (tự động tương thích cả chạy Server thường lẫn Serverless trên Vercel)

---

## BƯỚC 1: ĐẨY DỰ ÁN LÊN GITHUB

Nếu bạn chưa đưa code lên GitHub:
1. Mở PowerShell / Terminal tại thư mục gốc của dự án (`BTL_Khaipha`):
   ```bash
   git init
   git add .
   git commit -m "feat: complete blog project ready for deployment"
   ```
2. Tạo 1 repository mới trên [github.com](https://github.com/new) (ví dụ đặt tên: `blog-mern-project`).
3. Đẩy code lên GitHub:
   ```bash
   git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
   git branch -M main
   git push -u origin main
   ```

---

## BƯỚC 2: DEPLOY BACKEND (EXPRESS API) LÊN VERCEL

1. Đăng nhập vào [vercel.com](https://vercel.com).
2. Bấm nút **Add New...** $\rightarrow$ chọn **Project**.
3. Chọn Repository GitHub vừa tạo $\rightarrow$ bấm **Import**.
4. Tại phần **Configure Project**:
   * **Project Name**: Đặt tên (ví dụ: `vanban-blog-backend`).
   * **Root Directory**: Bấm nút **Edit** $\rightarrow$ chọn thư mục **`backend`** $\rightarrow$ bấm **Continue**.
   * **Framework Preset**: Chọn **Other**.
5. Mở mục **Environment Variables** và thêm các biến môi trường sau:

| Tên biến (Key) | Giá trị (Value) |
| :--- | :--- |
| `MONGODB` | `mongodb+srv://hhoang06:hoang30109@cluster0.lp1x925.mongodb.net/vanban-project` |
| `JWT_SECRET` | `blog_jwt_secret_key_hhoang06_2024` |
| `JWT_REFRESH_SECRET` | `blog_jwt_refresh_secret_key_hhoang06_2024` |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CLOUD_NAME` | `dwmzdnacn` |
| `API_KEY` | `329518412437938` |
| `API_SECRET` | `AU5GQzhPWQhNfkfPmTIcJAW_9QU` |
| `EMAIL` | `huyhoangbui612@gmail.com` |
| `PASS` | `uhbw bgfn hszu oxyy` |
| `CLIENT_URL` | `https://btl-khaipha.vercel.app` |

6. Bấm nút **Deploy**.
7. Chờ khoảng 30 giây đến 1 phút. Sau khi hoàn tất, Vercel sẽ cấp cho bạn một đường link backend, ví dụ:
   `https://btl-khaipha-sced.vercel.app`
8. **Kiểm tra**: Truy cập `https://btl-khaipha-sced.vercel.app/api/health` trên trình duyệt. Nếu hiển thị `{"status":"ok","message":"Blog API is running"}` là Backend đã hoạt động hoàn hảo!

---

## BƯỚC 3: DEPLOY FRONTEND (NEXT.JS) LÊN VERCEL

1. Quay lại trang Dashboard chính của [vercel.com](https://vercel.com).
2. Bấm nút **Add New...** $\rightarrow$ chọn **Project**.
3. Chọn lại cùng Repository GitHub đó $\rightarrow$ bấm **Import**.
4. Tại phần **Configure Project**:
   * **Project Name**: Đặt tên (ví dụ: `vanban-blog-web`).
   * **Root Directory**: Bấm nút **Edit** $\rightarrow$ chọn thư mục **`frontend`** $\rightarrow$ bấm **Continue**.
   * **Framework Preset**: Vercel sẽ tự động nhận diện là **Next.js**.
5. Mở mục **Environment Variables** và thêm biến sau:

| Tên biến (Key) | Giá trị (Value) |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://btl-khaipha-sced.vercel.app/api` |

6. Bấm nút **Deploy**.
7. Chờ khoảng 1-2 phút để Vercel build Next.js. Sau khi xong, bạn sẽ nhận được đường link chính thức của trang web blog:
   `https://btl-khaipha.vercel.app`

---

## BƯỚC 4: CẬP NHẬT LẠI CLIENT_URL Ở BACKEND (ĐẢM BẢO COOKIE & BẢO MẬT)

1. Vào lại Project **Backend** trên Vercel.
2. Vào tab **Settings** $\rightarrow$ mục **Environment Variables**.
3. Tìm biến `CLIENT_URL`, sửa giá trị thành đường link Frontend vừa tạo ở Bước 3:
   `https://btl-khaipha.vercel.app`
4. Vào tab **Deployments** $\rightarrow$ bấm vào dấu 3 chấm cạnh lần deploy mới nhất $\rightarrow$ chọn **Redeploy**.

---

## BƯỚC 5: DEPLOY LDA TOOL (TỰ ĐỘNG GÁN NHÃN) LÊN VERCEL

1. Vercel → **Add New...** → **Project** → chọn lại cùng Repository → **Import**.
2. **Root Directory**: chọn thư mục **`Tool`**; **Framework Preset**: **Other**.
3. Thêm Environment Variables:

| Tên biến (Key) | Giá trị (Value) |
| :--- | :--- |
| `MONGODB` | Giống `MONGODB` của Backend |
| `TOOL_SECRET` | Một chuỗi bí mật ngẫu nhiên (vd: tạo bằng `openssl rand -hex 32`) |
| `CRON_SECRET` | Một chuỗi bí mật ngẫu nhiên khác |

4. Bấm **Deploy**, kiểm tra `https://<link-tool>.vercel.app/api/health`.
5. Vào Project **Backend** → **Settings** → **Environment Variables**, thêm:

| Tên biến (Key) | Giá trị (Value) |
| :--- | :--- |
| `LDA_TOOL_URL` | `https://<link-tool>.vercel.app` |
| `LDA_TOOL_SECRET` | Giống `TOOL_SECRET` ở trên |

6. **Redeploy** Backend (và Frontend để có trang admin mới).
7. Đăng nhập admin → **Tự động gán nhãn (LDA)** → bấm **Đồng bộ ngay** để huấn luyện lần đầu.
   Sau đó Tool tự chạy: khi đăng bài mới chưa có nhãn, khi admin gán/sửa nhãn, và Cron hằng ngày.

Chi tiết thuật toán và API: xem [Tool/README.md](Tool/README.md).

---

## LƯU Ý QUAN TRỌNG VỀ MONGODB ATLAS:
Đảm bảo bạn đã cấp quyền truy cập IP trên **MongoDB Atlas**:
1. Đăng nhập vào [cloud.mongodb.com](https://cloud.mongodb.com).
2. Vào mục **Network Access** (ở cột bên trái).
3. Đảm bảo đã có dải IP `0.0.0.0/0` (Allow Access from Anywhere) để Vercel Serverless Function có thể kết nối được tới cơ sở dữ liệu.
