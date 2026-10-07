"""HTTP API của LDA Tool (Vercel Python Function, Flask).

GET  /api/health              kiểm tra sống
GET  /api/status              trạng thái mô hình + dữ liệu huấn luyện
POST /api/train   {force}     huấn luyện lại (chỉ khi dữ liệu thay đổi, trừ khi force)
POST /api/predict {postIds}   gán nhãn ngay cho các bài vừa tạo/sửa
POST /api/predict {title, content}  dự đoán thử, không ghi CSDL
GET|POST /api/sync {force}    đồng bộ toàn bộ (Vercel Cron gọi định kỳ)
"""
import os
import sys
import traceback
from datetime import datetime
from urllib.parse import parse_qs, urlencode

from flask import Flask, jsonify, request
from flask.json.provider import DefaultJSONProvider

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lda_tool import config, service  # noqa: E402


class JSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat()
        return DefaultJSONProvider.default(o)


class RestoreVercelPath:
    """Vercel rewrite mọi request về /api/index nên Flask không thấy đường dẫn gốc.
    vercel.json truyền đường dẫn gốc qua query ?__path=..., khôi phục lại tại đây."""

    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        query = parse_qs(environ.get("QUERY_STRING", ""), keep_blank_values=True)
        if "__path" in query:
            environ["PATH_INFO"] = "/" + query.pop("__path")[0].lstrip("/")
            environ["QUERY_STRING"] = urlencode(query, doseq=True)
        return self.wsgi_app(environ, start_response)


app = Flask(__name__)
app.json = JSONProvider(app)
app.wsgi_app = RestoreVercelPath(app.wsgi_app)


def _authorized():
    secrets = [s for s in (config.TOOL_SECRET, config.CRON_SECRET) if s]
    if not secrets:
        return True  # chưa cấu hình bí mật (chạy local)
    header_secret = request.headers.get("x-tool-secret", "")
    auth = request.headers.get("Authorization", "")
    bearer = auth[7:] if auth.startswith("Bearer ") else ""
    return header_secret in secrets or bearer in secrets


@app.before_request
def _check_auth():
    if request.path not in ("/", "/api/health") and not _authorized():
        return jsonify(success=False, message="Unauthorized"), 401


@app.errorhandler(Exception)
def _handle_error(error):
    traceback.print_exc()
    return jsonify(success=False, message=str(error)), 500


def _body():
    return request.get_json(silent=True) or {}


@app.get("/")
@app.get("/api/health")
def health():
    return jsonify(success=True, message="LDA Tool is running")


@app.get("/api/status")
def status():
    return jsonify(success=True, data=service.status())


@app.post("/api/train")
def train():
    model, meta = service.ensure_model(force=bool(_body().get("force")))
    return jsonify(
        success=True,
        data={"ready": model is not None, "reason": meta.get("reason"), "trainedAt": meta.get("trainedAt")},
    )


@app.post("/api/predict")
def predict():
    body = _body()
    if body.get("postIds"):
        return jsonify(success=True, data=service.label_posts(post_ids=body["postIds"]))
    return jsonify(success=True, data=service.predict_text(body.get("title", ""), body.get("content", "")))


@app.route("/api/sync", methods=["GET", "POST"])
def sync():
    return jsonify(success=True, data=service.sync(force_train=bool(_body().get("force"))))


if __name__ == "__main__":
    app.run(port=int(os.getenv("TOOL_PORT", 5001)), debug=True)
