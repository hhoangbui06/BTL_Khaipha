# 📝 VănBảnBlog - Nền tảng Viết Blog & Tương tác Cộng đồng

Hệ thống blog đa người dùng hoàn chỉnh được xây dựng trên nền tảng **MERN Stack kết hợp Next.js 14 App Router**. Ứng dụng bao gồm đầy đủ 2 giao diện người dùng (**Client**) và quản trị hệ thống (**Admin**) với phân quyền đa cấp, tương tác mạng xã hội (like, bình luận đa cấp, chia sẻ lên tường cá nhân - wall), tìm kiếm, bộ lọc chủ đề và gửi email qua Nodemailer.

---

## 🚀 Công nghệ sử dụng

- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Bcryptjs, Multer, Cloudinary, Nodemailer.
- **Frontend**: Next.js 14 (App Router), React 18, Vanilla CSS (Thiết kế Dark Theme Glassmorphism hiện đại, cao cấp), React Icons, React Quill, Axios, React Hot Toast, Date-fns.
- **Cơ sở dữ liệu**: MongoDB Atlas (Cloud) / Local MongoDB.

---

## 👥 Danh sách tài khoản thử nghiệm (Pre-seeded Accounts)

Để thuận tiện cho việc kiểm tra và chấm điểm, hệ thống đã hỗ trợ các tài khoản tương ứng với từng vai trò:

| Vai trò | Email | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **👑 Admin Tổng** | `admin@gmail.com` | `password123` | Toàn quyền hệ thống, xem dashboard, phân quyền vai trò người dùng, khóa tài khoản, duyệt bài, quản lý bình luận & nhãn |
| **✍️ Admin Bài viết** | `admin_posts@gmail.com` | `password123` | Quản lý & kiểm duyệt bài viết (duyệt/từ chối/ghim nổi bật), quản lý bình luận, quản lý nhãn chủ đề |
| **🎧 Admin CSKH** | `admin_support@gmail.com` | `password123` | Xem danh sách người dùng, hỗ trợ khách hàng, kiểm duyệt & xóa bình luận vi phạm |
| **👤 Thành viên** | `user@gmail.com` | `password123` | Đăng bài viết, chỉnh sửa bài của mình, thích bài, bình luận, trả lời bình luận, chia sẻ bài viết về tường cá nhân |

*(Tại màn hình Đăng nhập `/login`, có sẵn 4 nút bấm hỗ trợ tự động điền nhanh thông tin tài khoản để thử nghiệm tiện lợi).*

---

## 📌 Các tính năng chính đã triển khai

### 1. Phía Người dùng (Client)
- **Xác thực & Tài khoản**:
  - Đăng ký tài khoản (họ tên, email, mật khẩu $\ge$ 6 ký tự). Tự động gửi email xác thực tài khoản qua **Nodemailer**.
  - Đăng nhập, lưu session qua JWT & Cookie bảo mật, cơ chế refresh token tự động.
  - Quên mật khẩu & Đặt lại mật khẩu bằng token bảo mật gửi qua email.
  - Trang xác thực email (`/verify-email`).
- **Trang chủ & Khám phá bài viết**:
  - Banner giới thiệu hiện đại, bắt mắt.
  - Tìm kiếm bài viết theo từ khóa thời gian thực (Search bar).
  - Bộ lọc bài viết theo Nhãn / Chủ đề (Labels).
  - Sắp xếp bài viết linh hoạt: Mới nhất, Cũ nhất, Nhiều lượt thích nhất, Nhiều bình luận nhất, Nhiều lượt chia sẻ nhất, Ngẫu nhiên.
  - Phân trang chuẩn.
- **Chi tiết bài viết (`/posts/[slug]`)**:
  - Trình bày nội dung rich text HTML, ảnh thumbnail, thông tin tác giả, lượt xem, ngày đăng.
  - Nút **Thích (Like)** bài viết với đếm số lượt và hiệu ứng màu sắc.
  - Nút **Chia sẻ (Share)** bài viết lên tường cá nhân kèm lời bình cảm nghĩ.
  - **Hệ thống bình luận 2 cấp (Nested Comments)**: Viết bình luận mới, trả lời (reply) trực tiếp vào bình luận của người khác, xóa bình luận của mình hoặc admin.
  - Thẻ thông tin tác giả (Author Bio Card) kèm liên kết tới trang cá nhân.
- **Đăng bài & Chỉnh sửa bài viết**:
  - Trang soạn thảo bài viết mới (`/posts/create`): Trình soạn thảo văn bản phong phú (React Quill), tải ảnh bìa lên Cloudinary có xem trước, chọn/tạo nhãn mới, chọn trạng thái (Công khai / Bản nháp).
  - Trang chỉnh sửa bài viết (`/posts/edit/[id]`): Cập nhật tiêu đề, nội dung, ảnh bìa, nhãn.
  - Phân quyền private route: Chỉ thành viên đăng nhập mới được tạo/sửa bài.
- **Trang cá nhân & Tường (Wall Feed - `/profile/[id]`)**:
  - Hiển thị avatar, họ tên, vai trò, tiểu sử, ngày tham gia, thống kê số bài viết tự viết, số bài đã chia sẻ.
  - **Dòng thời gian kết hợp (Wall)**: Hiển thị cả bài viết do người dùng tự đăng VÀ bài viết được chia sẻ về tường kèm lời bình và mốc thời gian chia sẻ.
  - Bộ lọc tab: *Tất cả*, *Bài viết đã đăng*, *Bài viết đã chia sẻ*.
  - Cho phép gỡ bài đã chia sẻ khỏi tường cá nhân bất kỳ lúc nào.
- **Cài đặt tài khoản (`/profile/settings`)**:
  - Cập nhật thông tin cá nhân (họ tên, tiểu sử, số điện thoại, địa chỉ).
  - Tải lên ảnh đại diện mới lưu trữ trên Cloudinary.
  - Đổi mật khẩu tài khoản (yêu cầu mật khẩu hiện tại + mật khẩu mới $\ge$ 6 ký tự).

### 2. Phía Quản trị (Admin - `/admin`)
- **Phân quyền truy cập đa cấp (Role-based Access Control)**:
  - Tự động kiểm tra quyền hạn, chỉ admin mới được vào khu vực `/admin`.
  - Sidebar hiển thị các mục quản trị tương ứng với từng cấp độ admin.
- **Bảng tổng quan (Dashboard - `/admin`)**:
  - Thống kê tổng số: Người dùng, Bài viết, Bình luận, Nhãn chủ đề.
  - Biểu đồ phân bổ bài viết theo trạng thái (Đã xuất bản, Chờ duyệt, Bản nháp, Từ chối).
  - Danh sách bài viết mới nhất và người dùng mới đăng ký.
- **Quản lý người dùng (`/admin/users`)**:
  - Tìm kiếm người dùng theo tên hoặc email.
  - Lọc theo vai trò và trạng thái tài khoản.
  - Admin Tổng có thể chuyển đổi quyền của người dùng (`admin`, `admin_posts`, `admin_support`, `user`), khóa tài khoản (`banned`), hoặc xóa người dùng.
- **Quản lý bài viết (`/admin/posts`)**:
  - Tìm kiếm, lọc theo trạng thái (`published`, `pending`, `draft`, `rejected`).
  - Thay đổi trạng thái duyệt bài nhanh bằng dropdown.
  - Đặt/Gỡ bài viết nổi bật (Featured).
  - Chỉnh sửa hoặc xóa bài viết vi phạm.
- **Quản lý bình luận (`/admin/comments`)**:
  - Tìm kiếm nội dung bình luận trên toàn hệ thống.
  - Xem thông tin người bình luận và bài viết liên quan.
  - Xóa bình luận spam/vi phạm (tự động xóa kèm các câu trả lời phụ thuộc).
- **Quản lý Nhãn / Chủ đề (`/admin/labels`)**:
  - Tạo nhãn mới với bảng chọn màu (color picker).
  - Chỉnh sửa tên nhãn, màu sắc và mô tả.
  - Xóa nhãn.

---

## 🛠️ Hướng dẫn chạy dự án ở môi trường Local

### 1. Khởi động Backend
```bash
cd backend

# Chạy seed dữ liệu mẫu ban đầu (tạo các tài khoản admin, nhãn, bài viết mẫu)
npm run seed

# Khởi động server backend (chạy trên port 5000)
npm run dev
# hoặc
npm start
```
*Backend sẽ lắng nghe tại `http://localhost:5000`*.

### 2. Khởi động Frontend
Mở một cửa sổ dòng lệnh (terminal) thứ hai:
```bash
cd frontend

# Khởi động Next.js development server (chạy trên port 3000)
npm run dev
```
*Frontend sẽ chạy tại `http://localhost:3000`*.
Truy cập trình duyệt tại `http://localhost:3000` để bắt đầu trải nghiệm ứng dụng!
