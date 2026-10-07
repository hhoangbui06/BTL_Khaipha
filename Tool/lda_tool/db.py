"""Kết nối MongoDB (dùng chung cơ sở dữ liệu với backend Express)."""
from pymongo import MongoClient

from . import config

_client = None


def get_db():
    global _client
    if not config.MONGODB_URI:
        raise RuntimeError("Chưa cấu hình biến môi trường MONGODB")
    if _client is None:
        # Tái sử dụng kết nối giữa các lần gọi khi function còn "ấm"
        _client = MongoClient(config.MONGODB_URI, serverSelectionTimeoutMS=10000)
    return _client.get_default_database(config.MONGODB_DB)
