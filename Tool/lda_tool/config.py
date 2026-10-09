"""Cấu hình của LDA Tool (đọc từ biến môi trường)."""
import os
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent.parent

# Khi chạy local: đọc Tool/.env, nếu không có thì dùng chung backend/.env
try:
    from dotenv import load_dotenv

    load_dotenv(TOOL_DIR / ".env")
    load_dotenv(TOOL_DIR.parent / "backend" / ".env")
except ImportError:  # python-dotenv không bắt buộc trên Vercel
    pass


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _float(name, default):
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _bool(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


MONGODB_URI = os.getenv("MONGODB") or os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "vanban-project")

# Bí mật dùng chung giữa backend và Tool; Vercel Cron gửi CRON_SECRET
TOOL_SECRET = os.getenv("TOOL_SECRET", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")

# ---- Siêu tham số LDA ----
# Số chủ đề K: 0 = tự động bằng số nhãn đủ dữ liệu huấn luyện
NUM_TOPICS = _int("LDA_NUM_TOPICS", 0)
# alpha (doc-topic prior) và eta (topic-word prior); <= 0 nghĩa là dùng 1/K
DOC_TOPIC_PRIOR = _float("LDA_ALPHA", 0)
TOPIC_WORD_PRIOR = _float("LDA_ETA", 0.01)
MAX_FEATURES = _int("LDA_MAX_FEATURES", 5000)
RANDOM_STATE = _int("LDA_RANDOM_STATE", 42)

# ---- Collapsed Gibbs Sampling ----
# Huấn luyện: tổng số vòng lặp, số vòng bỏ đi ban đầu (burn-in) và khoảng cách
# giữa 2 lần lấy mẫu (thinning) để ước lượng phi/theta
GIBBS_ITER = _int("LDA_GIBBS_ITER", 500)
GIBBS_BURN_IN = _int("LDA_GIBBS_BURN_IN", 200)
GIBBS_THIN = _int("LDA_GIBBS_THIN", 10)
# Suy luận cho bài mới (fold-in Gibbs với phi cố định)
INFER_ITER = _int("LDA_INFER_ITER", 100)
INFER_BURN_IN = _int("LDA_INFER_BURN_IN", 50)
# Giới hạn thời gian huấn luyện (giây) để không vượt maxDuration 60s của Vercel
TRAIN_TIME_BUDGET = _float("LDA_TRAIN_TIME_BUDGET", 40)

# ---- Gán nhãn: tối thiểu 1, tối đa 2 nhãn / bài ----
MAX_LABELS_PER_POST = 2
# theta của bài viết được phân tích thành tỷ lệ nội dung thuộc từng nhãn (NNLS trên
# các centroid). Nhãn 1 = nhãn chiếm tỷ lệ lớn nhất (luôn gán). Một bài KHÔNG nhất
# thiết có 2 nhãn: nhãn 2 chỉ được gán khi thỏa TẤT CẢ các điều kiện:
#   share_2 >= SECOND_LABEL_MIN_SHARE            nhãn 2 chiếm >= 30% nội dung
#   share_1 + share_2 >= SECOND_LABEL_MIN_COVERAGE  2 nhãn đầu chiếm >= 60% nội dung
#       (nội dung rải đều nhiều nhãn = mô hình không chắc chắn -> chỉ gán 1 nhãn)
#   cosine(centroid_1, centroid_2) < SECOND_LABEL_MAX_CENTROID_SIM
#       (2 centroid quá giống nhau = mô hình chưa phân biệt được 2 nhãn)
#   nhãn 2 có >= SECOND_LABEL_MIN_DOCS bài huấn luyện (centroid ít dữ liệu không tin cậy)
# Bộ ngưỡng được chọn bằng kiểm định chéo leave-one-out trên 21 bài do người gán nhãn
# (6 bài có 2 nhãn): micro-F1 0.607, so với 0.542 khi chỉ gán 1 nhãn.
SECOND_LABEL_MIN_SHARE = _float("LDA_SECOND_LABEL_MIN_SHARE", 0.3)
SECOND_LABEL_MIN_COVERAGE = _float("LDA_SECOND_LABEL_MIN_COVERAGE", 0.6)
SECOND_LABEL_MAX_CENTROID_SIM = _float("LDA_SECOND_LABEL_MAX_CENTROID_SIM", 0.97)
SECOND_LABEL_MIN_DOCS = _int("LDA_SECOND_LABEL_MIN_DOCS", 2)

# ---- Dữ liệu huấn luyện ----
# Dùng cả bài do Tool tự gán nhãn (autoLabeled = true) để huấn luyện.
# Admin cần rà soát và gán lại các bài tự gán bị sai để mô hình không học theo lỗi.
TRAIN_ON_AUTO_LABELS = _bool("LDA_TRAIN_ON_AUTO_LABELS", True)
MIN_DOCS_PER_LABEL = _int("LDA_MIN_DOCS_PER_LABEL", 1)
MIN_LABELS = _int("LDA_MIN_LABELS", 2)
TITLE_WEIGHT = _int("LDA_TITLE_WEIGHT", 2)
# Dùng thêm tên + mô tả của nhãn (đã có bài viết) làm 1 "tài liệu mồi"
USE_LABEL_TEXT = _bool("LDA_USE_LABEL_TEXT", True)
# Mặc định chỉ đọc chữ của tiêu đề + nội dung (bỏ qua ảnh) nên không loại bài có ảnh.
# Đặt true nếu muốn loại hẳn các bài có ảnh trong nội dung khỏi dữ liệu huấn luyện.
EXCLUDE_IMAGE_POSTS = _bool("LDA_EXCLUDE_IMAGE_POSTS", False)

# Đổi giá trị này khi thay đổi thuật toán/tiền xử lý để buộc huấn luyện lại
ALGORITHM_VERSION = "lda-gibbs-centroid-v3"
