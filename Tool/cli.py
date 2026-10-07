"""Chạy Tool từ dòng lệnh (local).

    python cli.py status              # xem trạng thái mô hình, dữ liệu
    python cli.py train [--force]     # huấn luyện (lưu mô hình vào MongoDB)
    python cli.py sync [--force]      # huấn luyện nếu cần + gán nhãn bài chưa có nhãn
    python cli.py predict "tiêu đề" "nội dung"   # dự đoán thử, không ghi CSDL
    python cli.py evaluate [--ratio 0.3]         # đánh giá độ chính xác (không ghi CSDL)
    python cli.py tokenize "văn bản"             # xem kết quả tách từ tiếng Việt
    python cli.py serve               # chạy API tại http://localhost:5001
"""
import argparse
import json
import sys

from lda_tool import service
from lda_tool.preprocess import tokenize


def show(data):
    print(json.dumps(data, ensure_ascii=False, indent=2, default=str))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="LDA Tool - tự động gán nhãn bài viết")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    sub.add_parser("train").add_argument("--force", action="store_true")
    sub.add_parser("sync").add_argument("--force", action="store_true")
    p = sub.add_parser("predict")
    p.add_argument("title")
    p.add_argument("content", nargs="?", default="")
    sub.add_parser("evaluate").add_argument("--ratio", type=float, default=0.3)
    sub.add_parser("tokenize").add_argument("text")
    sub.add_parser("serve")
    args = parser.parse_args()

    if args.command == "status":
        show(service.status())
    elif args.command == "train":
        model, meta = service.ensure_model(force=args.force)
        meta = {k: v for k, v in meta.items() if k not in ("topicWord", "centroids", "vocabulary")}
        show(meta)
    elif args.command == "sync":
        show(service.sync(force_train=args.force))
    elif args.command == "predict":
        show(service.predict_text(args.title, args.content))
    elif args.command == "evaluate":
        show(service.evaluate(test_ratio=args.ratio))
    elif args.command == "tokenize":
        print(" ".join(tokenize(args.text)))
    elif args.command == "serve":
        from api.index import app

        app.run(port=5001, debug=True)


if __name__ == "__main__":
    main()
