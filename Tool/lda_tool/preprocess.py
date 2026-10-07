"""Tiền xử lý văn bản tiếng Việt cho LDA.

Quy trình: bỏ HTML -> chuẩn hóa Unicode (NFC) + chữ thường -> bỏ URL/email/số/
ký tự đặc biệt -> tách từ tiếng Việt bằng pyvi (vd: "trí tuệ nhân tạo" ->
"trí_tuệ nhân_tạo") -> loại stopword và token quá ngắn.
"""
import html
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

from . import config

IMAGE_PATTERN = re.compile(r"<img\b|!\[[^\]]*\]\([^)]*\)|data:image/", re.IGNORECASE)
SCRIPT_STYLE_PATTERN = re.compile(r"<(script|style)\b.*?</\1>", re.IGNORECASE | re.DOTALL)
TAG_PATTERN = re.compile(r"<[^>]+>")
URL_PATTERN = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"\S+@\S+\.\S+")
# Giữ lại chữ cái (kể cả tiếng Việt) và dấu "_" do pyvi sinh ra
NON_WORD_PATTERN = re.compile(r"[^\w\s]|\d", re.UNICODE)
SPACE_PATTERN = re.compile(r"\s+")

STOPWORDS_FILE = Path(__file__).resolve().parent / "resources" / "vietnamese-stopwords.txt"


def has_image(content):
    """Bài viết có chứa ảnh trong nội dung hay không (bị loại khỏi dữ liệu huấn luyện)."""
    return bool(content) and bool(IMAGE_PATTERN.search(content))


@lru_cache(maxsize=1)
def load_stopwords():
    words = set()
    for line in STOPWORDS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip().lower()
        if line and not line.startswith("#"):
            words.add(unicodedata.normalize("NFC", line).replace(" ", "_"))
    return frozenset(words)


@lru_cache(maxsize=1)
def _tokenizer():
    try:
        from pyvi import ViTokenizer

        return ViTokenizer.tokenize
    except Exception:  # pragma: no cover - fallback khi thiếu pyvi
        return None


def html_to_text(content):
    text = SCRIPT_STYLE_PATTERN.sub(" ", content or "")
    text = TAG_PATTERN.sub(" ", text)
    return html.unescape(text)


def clean_text(text):
    text = unicodedata.normalize("NFC", text).lower()
    text = URL_PATTERN.sub(" ", text)
    text = EMAIL_PATTERN.sub(" ", text)
    return SPACE_PATTERN.sub(" ", text).strip()


def tokenize(text):
    """Tách từ tiếng Việt, trả về danh sách token đã lọc stopword."""
    text = clean_text(text)
    if not text:
        return []
    segment = _tokenizer()
    if segment is not None:
        text = segment(text)
    text = NON_WORD_PATTERN.sub(" ", text)

    stopwords = load_stopwords()
    tokens = []
    for token in text.split():
        token = token.strip("_")
        if len(token) < 2 or token in stopwords:
            continue
        tokens.append(token)
    return tokens


def post_tokens(title, content):
    """Token của một bài viết: tiêu đề (được nhân trọng số) + nội dung."""
    title_tokens = tokenize(title or "")
    body_tokens = tokenize(html_to_text(content))
    return title_tokens * max(config.TITLE_WEIGHT, 1) + body_tokens
