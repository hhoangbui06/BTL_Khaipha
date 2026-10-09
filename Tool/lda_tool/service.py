"""Nghiệp vụ của Tool: đọc dữ liệu từ MongoDB, huấn luyện, gán nhãn tự động.

- Dữ liệu huấn luyện: các bài viết chưa xóa, có nhãn còn tồn tại: nhãn do con
  người gán và (mặc định, LDA_TRAIN_ON_AUTO_LABELS=true) cả nhãn do Tool tự gán.
  Tool chỉ đọc chữ của tiêu đề + nội dung, bỏ qua ảnh. Mỗi bài có tối đa 2 nhãn.
- Nhãn chưa có bài viết nào sẽ bị bỏ qua.
- Mỗi lần được gọi, Tool tính "dấu vân tay" (fingerprint) của dữ liệu huấn luyện.
  Nếu bài viết / nhãn thay đổi thì fingerprint đổi -> tự động huấn luyện lại.
- Chỉ bài viết CHƯA có nhãn (hoặc chỉ còn nhãn đã bị xóa) mới được gán 1-2 nhãn và
  đánh dấu autoLabeled = true. Bài đã có nhãn (do người hay do Tool gán) không
  bị gán lại, trừ khi admin bấm "Gán lại bài tự động" (relabel_auto).
"""
import hashlib
import random
from datetime import datetime, timezone

from bson import ObjectId

from . import config
from .db import get_db
from .lda_model import LdaLabeler
from .preprocess import has_image, post_tokens, tokenize

MODEL_ID = "current"
_cache = {"fingerprint": None, "model": None}


def _now():
    return datetime.now(timezone.utc)


def _object_ids(values):
    result = []
    for value in values or []:
        try:
            result.append(value if isinstance(value, ObjectId) else ObjectId(str(value)))
        except Exception:
            continue
    return result


# --------------------------------------------------------------------- data
def load_active_labels(db):
    labels = db.labels.find({"deleted": {"$ne": True}}, {"name": 1, "description": 1, "color": 1})
    return {str(label["_id"]): label for label in labels}


def collect_training_data(db, include_auto=None):
    """include_auto: có dùng bài do Tool tự gán nhãn để huấn luyện không
    (None = theo cấu hình LDA_TRAIN_ON_AUTO_LABELS)."""
    if include_auto is None:
        include_auto = config.TRAIN_ON_AUTO_LABELS
    labels = load_active_labels(db)
    query = {"deleted": {"$ne": True}, "labels.0": {"$exists": True}}
    if not include_auto:
        query["autoLabeled"] = {"$ne": True}
    cursor = db.posts.find(query, {"title": 1, "content": 1, "labels": 1, "autoLabeled": 1})

    posts, excluded_image = [], 0
    for post in cursor:
        if config.EXCLUDE_IMAGE_POSTS and has_image(post.get("content", "")):
            excluded_image += 1
            continue
        # Mỗi bài viết có tối đa 2 nhãn: lấy các nhãn còn tồn tại theo thứ tự đã gán
        post_labels = []
        for l in post.get("labels", []):
            if str(l) in labels and str(l) not in post_labels:
                post_labels.append(str(l))
        post_labels = post_labels[: config.MAX_LABELS_PER_POST]
        if post_labels:
            posts.append(
                {
                    "id": str(post["_id"]),
                    "title": post.get("title", ""),
                    "content": post.get("content", ""),
                    "labels": post_labels,
                    "auto": bool(post.get("autoLabeled")),
                }
            )

    label_counts = {}
    for post in posts:
        for label_id in post["labels"]:
            label_counts[label_id] = label_counts.get(label_id, 0) + 1
    trainable = sorted(l for l, c in label_counts.items() if c >= config.MIN_DOCS_PER_LABEL)

    for post in posts:
        post["labels"] = [l for l in post["labels"] if l in trainable]
    posts = [p for p in posts if p["labels"]]
    posts.sort(key=lambda p: p["id"])

    return {
        "labels": labels,
        "trainable_labels": trainable,
        "label_counts": {l: label_counts[l] for l in trainable},
        "posts": posts,
        "include_auto": include_auto,
        "auto_posts": sum(1 for p in posts if p["auto"]),
        "excluded_image_posts": excluded_image,
        "skipped_labels": sorted(set(labels) - set(trainable)),
    }


def fingerprint(data):
    h = hashlib.sha1()
    h.update(
        f"{config.ALGORITHM_VERSION}|{config.NUM_TOPICS}|{config.DOC_TOPIC_PRIOR}|"
        f"{config.TOPIC_WORD_PRIOR}|{config.GIBBS_ITER}|{config.GIBBS_BURN_IN}|{config.GIBBS_THIN}|"
        f"{config.INFER_ITER}|{config.INFER_BURN_IN}|{config.RANDOM_STATE}|"
        f"{config.TITLE_WEIGHT}|{config.USE_LABEL_TEXT}|{config.EXCLUDE_IMAGE_POSTS}|"
        f"auto={data.get('include_auto')}".encode()
    )
    for label_id in data["trainable_labels"]:
        label = data["labels"][label_id]
        h.update(f"L|{label_id}|{label.get('name', '')}|{label.get('description', '')}".encode())
    for post in data["posts"]:
        body = hashlib.sha1((post["title"] + "\x00" + post["content"]).encode()).hexdigest()
        h.update(f"P|{post['id']}|{body}|{','.join(post['labels'])}".encode())
    return h.hexdigest()


def _build_corpus(data, posts=None):
    documents, document_labels = [], []
    for post in data["posts"] if posts is None else posts:
        tokens = post_tokens(post["title"], post["content"])
        if tokens:
            documents.append(tokens)
            document_labels.append(post["labels"])
    if config.USE_LABEL_TEXT:
        for label_id in data["trainable_labels"]:
            label = data["labels"][label_id]
            tokens = tokenize(f"{label.get('name', '')} {label.get('description', '')}")
            if tokens:
                documents.append(tokens)
                document_labels.append([label_id])
    return documents, document_labels


# -------------------------------------------------------------------- model
def _train(db, data, fp):
    meta = {
        "_id": MODEL_ID,
        "fingerprint": fp,
        "algorithm": config.ALGORITHM_VERSION,
        "trainedAt": _now(),
        "ready": False,
        "reason": None,
        "stats": {
            "trainingPosts": len(data["posts"]),
            "autoLabeledTrainingPosts": data["auto_posts"],
            "includesAutoLabels": data["include_auto"],
            "excludedImagePosts": data["excluded_image_posts"],
            "labelDocCounts": data["label_counts"],
            "skippedLabels": data["skipped_labels"],
        },
    }

    model = None
    if len(data["trainable_labels"]) < config.MIN_LABELS:
        meta["reason"] = (
            f"Cần ít nhất {config.MIN_LABELS} nhãn có bài viết để huấn luyện, "
            f"hiện có {len(data['trainable_labels'])}"
        )
    else:
        documents, document_labels = _build_corpus(data)
        if len(documents) < 2:
            meta["reason"] = "Không đủ văn bản sau tiền xử lý để huấn luyện"
        else:
            model = LdaLabeler.train(
                documents, document_labels, data["trainable_labels"], label_train_counts=data["label_counts"]
            )
            meta.update(model.to_document())
            meta["ready"] = True
            meta["stats"]["documents"] = len(documents)
            meta["stats"]["vocabularySize"] = len(model.vocabulary)
            meta["stats"]["perplexity"] = round(model.perplexity, 2)
            meta["stats"]["gibbs"] = model.gibbs_info
            meta["topics"] = model.top_words(10)

    db.lda_models.replace_one({"_id": MODEL_ID}, meta, upsert=True)
    _cache.update(fingerprint=fp, model=model)
    return model, meta


def ensure_model(force=False, include_auto=None):
    """Trả về (model, meta). Tự huấn luyện lại nếu dữ liệu đã thay đổi.

    include_auto=False: chỉ học từ nhãn do người gán (dùng khi gán lại bài tự động).
    """
    db = get_db()
    data = collect_training_data(db, include_auto=include_auto)
    fp = fingerprint(data)

    if not force:
        if _cache["fingerprint"] == fp and _cache["model"] is not None:
            meta = db.lda_models.find_one({"_id": MODEL_ID}, {"topicWord": 0, "centroids": 0, "vocabulary": 0})
            if meta and meta.get("fingerprint") == fp:
                return _cache["model"], meta
        stored = db.lda_models.find_one({"_id": MODEL_ID})
        if stored and stored.get("fingerprint") == fp:
            model = LdaLabeler.from_document(stored) if stored.get("ready") else None
            _cache.update(fingerprint=fp, model=model)
            return model, stored

    return _train(db, data, fp)


# ----------------------------------------------------------------- labeling
def label_posts(post_ids=None, relabel_auto=False, model=None, meta=None):
    """Gán 1-2 nhãn cho các bài CHƯA có nhãn (hoặc chỉ còn nhãn đã bị xóa).

    post_ids: chỉ xử lý các bài này (dùng khi backend vừa tạo/sửa bài);
    None: quét toàn bộ cơ sở dữ liệu.
    relabel_auto: True -> gán lại cả các bài do Tool đã gán trước đó (admin chủ động
    yêu cầu, vd sau khi đổi ngưỡng). Nhãn do con người gán không bao giờ bị thay đổi.
    """
    db = get_db()
    if model is None:
        model, meta = ensure_model()
    if model is None:
        return {"ready": False, "reason": meta.get("reason"), "labeled": []}

    model_fp = meta["fingerprint"]
    labels = load_active_labels(db)
    # $nin: bài không có nhãn nào thuộc danh sách nhãn còn tồn tại
    query = {
        "deleted": {"$ne": True},
        "autoLabelDisabled": {"$ne": True},  # admin đã chủ động xóa nhãn -> bỏ qua
        "labels": {"$nin": _object_ids(labels.keys())},
    }
    if relabel_auto:
        query.pop("labels")
        query["$or"] = [{"labels": {"$nin": _object_ids(labels.keys())}}, {"autoLabeled": True}]
    if post_ids:
        query["_id"] = {"$in": _object_ids(post_ids)}

    results = []
    for post in db.posts.find(query, {"title": 1, "content": 1}):
        prediction = model.predict_labels(post_tokens(post.get("title"), post.get("content")))
        if prediction is None:
            results.append({"postId": str(post["_id"]), "skipped": "Không có từ nào thuộc bộ từ vựng"})
            continue

        selected, cosine = prediction
        score = cosine[selected[0][0]]  # độ tương đồng cosine của nhãn chính
        db.posts.update_one(
            {"_id": post["_id"]},
            {
                "$set": {
                    "labels": [ObjectId(label_id) for label_id, _ in selected],
                    "autoLabeled": True,
                    "autoLabelScore": score,
                    "autoLabelShares": [share for _, share in selected],
                    "autoLabelModel": model_fp,
                    "autoLabeledAt": _now(),
                }
            },
        )
        results.append(
            {
                "postId": str(post["_id"]),
                "title": post.get("title"),
                "labelId": selected[0][0],
                "labelName": " + ".join(labels.get(l, {}).get("name", "?") for l, _ in selected),
                "score": score,
                "labels": [
                    {"id": l, "name": labels.get(l, {}).get("name"), "share": s} for l, s in selected
                ],
            }
        )
    return {"ready": True, "model": model_fp, "labeled": results}


def sync(force_train=False, relabel_auto=False):
    """Đồng bộ toàn bộ: huấn luyện lại nếu cần rồi gán nhãn cho các bài chưa có nhãn.

    relabel_auto=True: gán lại cả các bài do Tool đã gán (không đụng nhãn do người gán).
    Khi gán lại, mô hình CHỈ học từ nhãn do người gán; nếu học cả nhãn tự gán thì mô
    hình sẽ lặp lại đúng các nhãn sai cũ. Lần gọi sau Tool tự huấn luyện lại với
    toàn bộ dữ liệu (gồm cả các nhãn vừa gán lại).
    """
    model, meta = ensure_model(force=force_train, include_auto=False if relabel_auto else None)
    result = label_posts(relabel_auto=relabel_auto, model=model, meta=meta) if model is not None else {
        "ready": False,
        "reason": meta.get("reason"),
        "labeled": [],
    }
    result["trainedAt"] = meta.get("trainedAt")
    return result


def predict_text(title="", content=""):
    """Dự đoán nhãn cho một đoạn văn bản bất kỳ (không ghi vào CSDL)."""
    model, meta = ensure_model()
    if model is None:
        return {"ready": False, "reason": meta.get("reason")}
    prediction = model.predict_labels(post_tokens(title, content))
    if prediction is None:
        return {"ready": True, "label": None, "labels": [], "reason": "Không có từ nào thuộc bộ từ vựng"}
    labels = load_active_labels(get_db())
    selected, scores = prediction
    chosen = [
        {"id": l, "name": labels.get(l, {}).get("name"), "score": scores[l], "share": share}
        for l, share in selected
    ]
    return {
        "ready": True,
        "label": chosen[0],
        "labels": chosen,
        "scores": sorted(
            ({"id": l, "name": labels.get(l, {}).get("name"), "score": s} for l, s in scores.items()),
            key=lambda x: -x["score"],
        ),
    }


def status():
    db = get_db()
    data = collect_training_data(db)
    current_fp = fingerprint(data)
    meta = db.lda_models.find_one({"_id": MODEL_ID}, {"topicWord": 0, "centroids": 0, "vocabulary": 0}) or {}
    labels = data["labels"]
    meta.pop("_id", None)

    def named(label_id):
        return {"id": label_id, "name": labels.get(label_id, {}).get("name", "(đã xóa)")}

    active_ids = _object_ids(labels.keys())
    return {
        "model": {
            **meta,
            "labelIds": [named(l) for l in meta.get("labelIds", [])],
            "stale": meta.get("fingerprint") != current_fp,
        },
        "data": {
            "trainingPosts": len(data["posts"]),
            "autoLabeledTrainingPosts": data["auto_posts"],
            "includesAutoLabels": data["include_auto"],
            "excludedImagePosts": data["excluded_image_posts"],
            "trainableLabels": [{**named(l), "posts": data["label_counts"][l]} for l in data["trainable_labels"]],
            "skippedLabels": [named(l) for l in data["skipped_labels"]],
            "unlabeledPosts": db.posts.count_documents({"deleted": {"$ne": True}, "labels": {"$nin": active_ids}}),
            "autoLabeledPosts": db.posts.count_documents({"deleted": {"$ne": True}, "autoLabeled": True}),
        },
    }


def evaluate(test_ratio=0.3, seed=42):
    """Đánh giá offline: chia train/test trên các bài do NGƯỜI gán nhãn (không ghi CSDL).

    Không dùng nhãn tự gán vì đó là dự đoán của chính Tool, không phải đáp án đúng.
    """
    data = collect_training_data(get_db(), include_auto=False)
    posts = list(data["posts"])
    random.Random(seed).shuffle(posts)
    n_test = max(1, int(len(posts) * test_ratio))
    test, train = posts[:n_test], posts[n_test:]
    train_labels = sorted({l for p in train for l in p["labels"]})
    if len(train_labels) < 2 or not test:
        return {"error": "Không đủ dữ liệu để đánh giá (cần nhiều bài có nhãn hơn)"}

    documents, document_labels = _build_corpus({**data, "trainable_labels": train_labels}, train)
    train_counts = {}
    for p in train:
        for l in p["labels"]:
            train_counts[l] = train_counts.get(l, 0) + 1
    model = LdaLabeler.train(documents, document_labels, train_labels, label_train_counts=train_counts)
    correct, exact, details = 0, 0, []
    for post in test:
        prediction = model.predict_labels(post_tokens(post["title"], post["content"]))
        predicted = [l for l, _ in prediction[0]] if prediction else []
        # Đúng (top-1): nhãn chính dự đoán nằm trong nhãn thật
        ok = bool(predicted) and predicted[0] in post["labels"]
        # Khớp hoàn toàn: tập nhãn dự đoán trùng tập nhãn thật
        same = set(predicted) == set(post["labels"])
        correct += ok
        exact += same
        details.append(
            {
                "title": post["title"],
                "true": [data["labels"][l]["name"] for l in post["labels"]],
                "predicted": [data["labels"].get(l, {}).get("name") for l in predicted],
                "correct": ok,
                "exactMatch": same,
            }
        )
    return {
        "train": len(train),
        "test": len(test),
        "accuracy": round(correct / len(test), 4),
        "exactMatch": round(exact / len(test), 4),
        "perplexity": round(model.perplexity, 2),
        "details": details,
    }
