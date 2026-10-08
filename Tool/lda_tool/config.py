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
MAX_ITER = _int("LDA_MAX_ITER", 100)
# alpha (doc-topic prior) và eta (topic-word prior); <= 0 nghĩa là dùng 1/K
DOC_TOPIC_PRIOR = _float("LDA_ALPHA", 0)
TOPIC_WORD_PRIOR = _float("LDA_ETA", 0.01)
MAX_FEATURES = _int("LDA_MAX_FEATURES", 5000)
RANDOM_STATE = _int("LDA_RANDOM_STATE", 42)

# ---- Dữ liệu huấn luyện ----
MIN_DOCS_PER_LABEL = _int("LDA_MIN_DOCS_PER_LABEL", 1)
MIN_LABELS = _int("LDA_MIN_LABELS", 2)
TITLE_WEIGHT = _int("LDA_TITLE_WEIGHT", 2)
# Dùng thêm tên + mô tả của nhãn (đã có bài viết) làm 1 "tài liệu mồi"
USE_LABEL_TEXT = _bool("LDA_USE_LABEL_TEXT", True)
# Mặc định chỉ đọc chữ của tiêu đề + nội dung (bỏ qua ảnh) nên không loại bài có ảnh.
# Đặt true nếu muốn loại hẳn các bài có ảnh trong nội dung khỏi dữ liệu huấn luyện.
EXCLUDE_IMAGE_POSTS = _bool("LDA_EXCLUDE_IMAGE_POSTS", False)

# Đổi giá trị này khi thay đổi thuật toán/tiền xử lý để buộc huấn luyện lại
ALGORITHM_VERSION = "lda-centroid-v2"
