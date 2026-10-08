# LDA Tool – Tự động gán nhãn bài viết

Tool Python dùng **LDA (Latent Dirichlet Allocation)** để tự gán **đúng 1 nhãn** cho bài viết chưa có nhãn.
Bài viết đã có nhãn (do người hoặc do Tool gán) không bao giờ bị gán lại.
Tool đọc trực tiếp MongoDB của website, tự huấn luyện lại khi dữ liệu thay đổi và được deploy lên Vercel
như một project riêng (Root Directory = `Tool`).

## Cấu trúc

```
Tool/
├── api/index.py              # HTTP API (Flask) – Vercel Python Function
├── lda_tool/
│   ├── config.py             # Biến môi trường, siêu tham số
│   ├── db.py                 # Kết nối MongoDB
│   ├── preprocess.py         # Tiền xử lý tiếng Việt (pyvi tách từ, stopword)
│   ├── lda_model.py          # Huấn luyện LDA + suy luận θ + gán nhãn
│   ├── service.py            # Đọc dữ liệu, fingerprint, train, gán nhãn, sync
│   └── resources/vietnamese-stopwords.txt
├── cli.py                    # Chạy local bằng dòng lệnh
├── requirements.txt
└── vercel.json               # Cấu hình function + Cron
```

## Thuật toán

1. **Dữ liệu huấn luyện**: bài viết chưa xóa, có nhãn do người dùng/admin gán (`autoLabeled != true`).
   Tool **chỉ đọc chữ của tiêu đề + nội dung**; ảnh (`<img>`, ảnh markdown, `data:image`) và thumbnail bị bỏ qua.
   Mỗi bài chỉ có 1 nhãn (bài cũ nhiều nhãn thì lấy nhãn đầu tiên). Nhãn chưa có bài viết bị bỏ qua.
   Muốn loại hẳn bài có ảnh khỏi dữ liệu huấn luyện: đặt `LDA_EXCLUDE_IMAGE_POSTS=true`.
2. **Tiền xử lý**: bỏ HTML → chuẩn hóa Unicode NFC, chữ thường → bỏ URL/email/số/ký tự đặc biệt →
   **tách từ tiếng Việt bằng `pyvi`** (`trí tuệ nhân tạo` → `trí_tuệ nhân_tạo`) → bỏ stopword.
   Tiêu đề được nhân trọng số 2. Tên + mô tả của nhãn được thêm làm 1 “tài liệu mồi”.
3. **LDA**: Bag-of-Words (`CountVectorizer`) → `LatentDirichletAllocation` (Variational Bayes, scikit-learn)
   với K = số nhãn có dữ liệu (đổi bằng `LDA_NUM_TOPICS`), α = 1/K, η = 0.01.
4. **Ánh xạ chủ đề → nhãn**: suy luận phân phối chủ đề θ của từng bài; *centroid* của nhãn L
   là trung bình θ các bài thuộc L.
5. **Gán nhãn**: bài mới → suy luận θ_new (E-step VB, cài bằng numpy) → chọn nhãn có
   `cosine(θ_new, centroid_L)` lớn nhất. Lưu `autoLabeled=true`, `autoLabelScore` vào bài viết.
   Chỉ bài **chưa có nhãn** (hoặc chỉ còn nhãn đã bị xóa) mới được gán.

Mô hình được lưu trong collection `lda_models` (mảng numpy dạng `.npy`), nên không phụ thuộc phiên bản pickle.

## Tự động cập nhật & tự chạy

| Sự kiện | Ai kích hoạt | Tool làm gì |
| --- | --- | --- |
| Đăng bài không chọn nhãn | backend gọi `POST /api/predict` | gán nhãn ngay (chờ tối đa 8s, sau đó chạy nền) |
| Sửa bài và bỏ hết nhãn | backend gọi `POST /api/predict` | gán nhãn (vì bài không còn nhãn) |
| Admin gán nhãn, tạo nhãn mới, sửa/xóa nhãn, sửa/xóa bài | backend gọi `POST /api/sync` (chạy nền) | huấn luyện lại nếu dữ liệu đổi, gán nhãn cho bài chưa có nhãn |
| Hằng ngày 00:00 UTC | **Vercel Cron** gọi `GET /api/sync` | đồng bộ toàn bộ (lưới an toàn) |

Tool dùng **fingerprint** (SHA-1 của nội dung + nhãn của toàn bộ dữ liệu huấn luyện). Mỗi lần được gọi,
nếu fingerprint khác với mô hình đã lưu thì Tool tự huấn luyện lại trước khi dự đoán, nên mô hình luôn khớp
với dữ liệu mới nhất. Bài đã có nhãn **không bao giờ bị Tool gán lại**; khi admin gán lại nhãn cho bài
tự gán, bài đó trở thành dữ liệu huấn luyện.

## API

Tất cả (trừ `/api/health`) yêu cầu header `x-tool-secret: <TOOL_SECRET>` hoặc `Authorization: Bearer <CRON_SECRET>`.

| Method | Path | Body | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/health` | – | kiểm tra sống |
| GET | `/api/status` | – | trạng thái mô hình, chủ đề, dữ liệu |
| POST | `/api/train` | `{force}` | huấn luyện (bỏ qua nếu dữ liệu không đổi, trừ khi `force`) |
| POST | `/api/predict` | `{postIds: [...]}` | gán nhãn cho các bài (ghi CSDL) |
| POST | `/api/predict` | `{title, content}` | dự đoán thử (không ghi CSDL) |
| GET/POST | `/api/sync` | `{force}` | huấn luyện nếu cần + gán nhãn bài còn thiếu |

## Chạy local

```bash
cd Tool
pip install -r requirements.txt
python cli.py status            # tự đọc MONGODB từ Tool/.env hoặc backend/.env
python cli.py evaluate          # đánh giá accuracy train/test (không ghi CSDL)
python cli.py sync              # huấn luyện + gán nhãn (GHI vào CSDL)
python cli.py serve             # API tại http://localhost:5001
```

Backend local: thêm vào `backend/.env`:
```
LDA_TOOL_URL=http://localhost:5001
LDA_TOOL_SECRET=<giống TOOL_SECRET, có thể bỏ trống khi chạy local>
```

## Deploy lên Vercel

1. Vercel → **Add New → Project** → chọn repo → **Root Directory: `Tool`**, Framework: **Other**.
2. Environment Variables:
   - `MONGODB` – chuỗi kết nối MongoDB Atlas (giống backend)
   - `TOOL_SECRET` – chuỗi bí mật ngẫu nhiên
   - `CRON_SECRET` – chuỗi bí mật ngẫu nhiên khác (Vercel Cron tự gửi kèm)
3. Deploy, kiểm tra `https://<tool>.vercel.app/api/health`.
4. Ở project **backend** thêm `LDA_TOOL_URL=https://<tool>.vercel.app` và `LDA_TOOL_SECRET=<TOOL_SECRET>` → Redeploy.
5. Vào trang admin → **Tự động gán nhãn (LDA)** → bấm **Đồng bộ ngay** để huấn luyện lần đầu.

> Gói Hobby của Vercel chỉ cho Cron chạy 1 lần/ngày; các thay đổi trên website vẫn được xử lý ngay nhờ
> backend gọi Tool. Nếu dùng gói Pro có thể đổi `schedule` trong `vercel.json` thành `*/15 * * * *`.

## Lưu ý về chất lượng

LDA là mô hình thống kê: cần **nhiều bài có nhãn** (khuyến nghị ≥ 10 bài/nhãn, mỗi bài ≥ 100 từ) để chủ đề
có ý nghĩa. Dùng `python cli.py evaluate` để đo độ chính xác khi dữ liệu tăng và chỉnh `LDA_NUM_TOPICS`,
`LDA_MAX_ITER`, `LDA_ALPHA` trong biến môi trường.
