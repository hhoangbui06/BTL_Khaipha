"""Mô hình LDA (Collapsed Gibbs Sampling) dùng để gán nhãn bài viết.

Ý tưởng:
1. Huấn luyện LDA (Latent Dirichlet Allocation) bằng Collapsed Gibbs Sampling
   (Griffiths & Steyvers, 2004) trên các bài viết ĐÃ có nhãn, thu được K chủ đề,
   mỗi chủ đề là một phân phối xác suất trên từ vựng (phi).
2. Mỗi bài viết d có phân phối chủ đề theta_d (K chiều).
3. Mỗi nhãn L được biểu diễn bằng "centroid chủ đề" = trung bình theta của các
   bài thuộc nhãn L.
4. Bài viết mới chưa có nhãn: suy luận theta_new bằng Gibbs (fold-in, giữ phi cố
   định) rồi gán nhãn có độ tương đồng cosine(theta_new, centroid_L) lớn nhất
   (mỗi bài gán đúng 1 nhãn).

Collapsed Gibbs Sampling: tích phân (collapse) theta và phi, chỉ lấy mẫu biến
chủ đề z của từng từ. Với từ thứ i (từ w, trong tài liệu d), bỏ phép gán hiện tại
ra khỏi các bộ đếm rồi lấy mẫu chủ đề mới theo:

    P(z_i = k | z_-i, w) ∝ (n_dk + alpha) * (n_kw + eta) / (n_k + V * eta)

    n_dk: số từ trong tài liệu d đang gán chủ đề k
    n_kw: số lần từ w được gán chủ đề k (trên toàn bộ dữ liệu)
    n_k : tổng số từ đang gán chủ đề k
    V   : kích thước bộ từ vựng

Sau giai đoạn burn-in, cứ mỗi `thin` vòng lấy một mẫu để ước lượng:

    phi_kw   = (n_kw + eta)   / (n_k + V * eta)
    theta_dk = (n_dk + alpha) / (N_d + K * alpha)

Mô hình được lưu dưới dạng mảng số (phi, centroid) vào MongoDB.
"""
import io
import time

import numpy as np
from scipy.optimize import nnls
from sklearn.feature_extraction.text import CountVectorizer

from . import config


def _identity(tokens):
    return tokens


def _to_bytes(array):
    buffer = io.BytesIO()
    np.save(buffer, np.asarray(array, dtype=np.float32), allow_pickle=False)
    return buffer.getvalue()


def _from_bytes(data):
    return np.load(io.BytesIO(bytes(data)), allow_pickle=False).astype(np.float64)


def _sample(cumulative, u, n_topics):
    """Chọn chủ đề k đầu tiên có xác suất tích lũy >= u."""
    k = 0
    while k < n_topics - 1 and cumulative[k] < u:
        k += 1
    return k


def gibbs_train(docs, vocab_size, n_topics, alpha, eta, n_iter, burn_in, thin, seed, time_budget=None):
    """Collapsed Gibbs Sampling cho LDA.

    docs: list các tài liệu, mỗi tài liệu là list id từ (0..V-1).
    Trả về (phi K x V, theta D x K, thông tin quá trình lấy mẫu).
    """
    rng = np.random.default_rng(seed)
    n_docs = len(docs)
    v_eta = vocab_size * eta
    burn_in = min(burn_in, max(n_iter // 2, 0))
    thin = max(thin, 1)

    # Bộ đếm dùng list Python thuần (nhanh hơn numpy khi truy cập từng phần tử)
    n_dk = [[0] * n_topics for _ in range(n_docs)]
    n_wk = [[0] * n_topics for _ in range(vocab_size)]  # n_kw lưu theo hàng từ
    n_k = [0] * n_topics
    z = []

    # Khởi tạo: gán chủ đề ngẫu nhiên cho từng từ
    for d, doc in enumerate(docs):
        z_d = rng.integers(n_topics, size=len(doc)).tolist()
        z.append(z_d)
        for w, k in zip(doc, z_d):
            n_dk[d][k] += 1
            n_wk[w][k] += 1
            n_k[k] += 1

    total_tokens = sum(len(doc) for doc in docs)
    doc_lengths = np.array([len(doc) for doc in docs], dtype=np.float64)
    phi_sum = np.zeros((n_topics, vocab_size))
    theta_sum = np.zeros((n_docs, n_topics))
    samples = 0
    cumulative = [0.0] * n_topics
    started = time.monotonic()
    stopped_early = False

    def collect_sample():
        nwk = np.asarray(n_wk, dtype=np.float64)  # V x K
        nk = np.asarray(n_k, dtype=np.float64)
        np.add(phi_sum, ((nwk + eta) / (nk + v_eta)).T, out=phi_sum)
        ndk = np.asarray(n_dk, dtype=np.float64)
        np.add(theta_sum, (ndk + alpha) / (doc_lengths[:, None] + n_topics * alpha), out=theta_sum)

    iteration = 0
    for iteration in range(1, n_iter + 1):
        uniforms = rng.random(total_tokens).tolist()
        r = 0
        for d in range(n_docs):
            doc = docs[d]
            z_d = z[d]
            nd = n_dk[d]
            for i in range(len(doc)):
                w = doc[i]
                k = z_d[i]
                nw = n_wk[w]
                # Bỏ phép gán hiện tại của từ i khỏi các bộ đếm
                nd[k] -= 1
                nw[k] -= 1
                n_k[k] -= 1

                # P(z_i = t | ...) ∝ (n_dt + alpha) * (n_tw + eta) / (n_t + V*eta)
                total = 0.0
                for t in range(n_topics):
                    total += (nd[t] + alpha) * (nw[t] + eta) / (n_k[t] + v_eta)
                    cumulative[t] = total
                k = _sample(cumulative, uniforms[r] * total, n_topics)
                r += 1

                # Gán chủ đề mới và cập nhật bộ đếm
                z_d[i] = k
                nd[k] += 1
                nw[k] += 1
                n_k[k] += 1

        if iteration > burn_in and (iteration - burn_in) % thin == 0:
            collect_sample()
            samples += 1

        if time_budget and time.monotonic() - started > time_budget:
            stopped_early = iteration < n_iter
            break

    if samples == 0:  # dừng sớm trước khi hết burn-in -> dùng trạng thái hiện tại
        collect_sample()
        samples = 1

    phi = phi_sum / samples
    theta = theta_sum / samples
    info = {
        "iterations": iteration,
        "burnIn": burn_in,
        "thin": thin,
        "samples": samples,
        "tokens": total_tokens,
        "seconds": round(time.monotonic() - started, 2),
        "stoppedEarly": stopped_early,
    }
    return phi, theta, info


class LdaLabeler:
    def __init__(self, vocabulary, topic_word, doc_topic_prior, label_ids, centroids, label_train_counts=None):
        self.vocabulary = list(vocabulary)
        self.word_index = {w: i for i, w in enumerate(self.vocabulary)}
        self.topic_word = np.asarray(topic_word, dtype=np.float64)  # phi (K x V)
        self.doc_topic_prior = float(doc_topic_prior)
        self.label_ids = list(label_ids)
        self.centroids = np.asarray(centroids, dtype=np.float64)  # (L x K)
        # Số bài viết huấn luyện của từng nhãn (cùng thứ tự label_ids)
        self.label_train_counts = (
            list(label_train_counts) if label_train_counts is not None else [0] * len(self.label_ids)
        )
        norms = np.linalg.norm(self.centroids, axis=1, keepdims=True)
        self._unit_centroids = self.centroids / np.maximum(norms, 1e-12)

    @property
    def num_topics(self):
        return self.topic_word.shape[0]

    # ------------------------------------------------------------------ train
    @classmethod
    def train(cls, documents, document_labels, label_ids, num_topics=None, label_train_counts=None):
        """documents: list[list[str]]; document_labels: list[list[label_id]].

        label_train_counts: {label_id: số bài viết huấn luyện} (không tính tài liệu mồi);
        dùng để chỉ cho nhãn đủ dữ liệu được làm nhãn thứ 2.
        """
        n_topics = num_topics or config.NUM_TOPICS or len(label_ids)
        n_topics = max(int(n_topics), 2)
        alpha = config.DOC_TOPIC_PRIOR if config.DOC_TOPIC_PRIOR > 0 else 1.0 / n_topics
        eta = config.TOPIC_WORD_PRIOR

        # Bộ từ vựng (Bag-of-Words)
        vectorizer = CountVectorizer(
            analyzer=_identity,
            max_df=0.95 if len(documents) >= 20 else 1.0,
            min_df=2 if len(documents) >= 50 else 1,
            max_features=config.MAX_FEATURES,
        )
        vectorizer.fit(documents)
        vocabulary = vectorizer.get_feature_names_out()
        word_index = {w: i for i, w in enumerate(vocabulary)}

        # Mỗi tài liệu -> danh sách id từ (giữ thứ tự và số lần lặp của từ)
        docs, labels = [], []
        for tokens, doc_labels in zip(documents, document_labels):
            ids = [word_index[t] for t in tokens if t in word_index]
            if ids:
                docs.append(ids)
                labels.append(doc_labels)

        phi, theta, info = gibbs_train(
            docs,
            vocab_size=len(vocabulary),
            n_topics=n_topics,
            alpha=alpha,
            eta=eta,
            n_iter=config.GIBBS_ITER,
            burn_in=config.GIBBS_BURN_IN,
            thin=config.GIBBS_THIN,
            seed=config.RANDOM_STATE,
            time_budget=config.TRAIN_TIME_BUDGET,
        )

        # Centroid chủ đề của từng nhãn = trung bình theta các tài liệu thuộc nhãn
        sums = np.zeros((len(label_ids), n_topics))
        totals = np.zeros(len(label_ids))
        position = {label_id: i for i, label_id in enumerate(label_ids)}
        for theta_d, doc_labels in zip(theta, labels):
            for label_id in doc_labels:
                if label_id in position:
                    sums[position[label_id]] += theta_d
                    totals[position[label_id]] += 1
        centroids = sums / np.maximum(totals, 1)[:, None]

        if label_train_counts is None:
            counts = [int(t) for t in totals]
        else:
            counts = [int(label_train_counts.get(label_id, 0)) for label_id in label_ids]

        model = cls(vocabulary, phi, alpha, label_ids, centroids, counts)
        model.gibbs_info = info
        model.perplexity = model._perplexity(docs, theta)
        return model

    def _perplexity(self, docs, theta):
        """Perplexity trên dữ liệu huấn luyện: exp(-tổng log p(w|d) / số từ)."""
        log_likelihood, n_tokens = 0.0, 0
        for ids, theta_d in zip(docs, theta):
            probs = theta_d @ self.topic_word[:, ids]
            log_likelihood += float(np.log(np.maximum(probs, 1e-300)).sum())
            n_tokens += len(ids)
        return float(np.exp(-log_likelihood / max(n_tokens, 1)))

    # -------------------------------------------------------------- inference
    def infer_theta(self, tokens, n_iter=None, burn_in=None):
        """Suy luận theta của tài liệu mới bằng Gibbs Sampling (fold-in).

        Giữ phi cố định, chỉ lấy mẫu chủ đề cho các từ của tài liệu mới:
            P(z_i = k) ∝ (n_dk + alpha) * phi_kw
        """
        ids = [self.word_index[t] for t in tokens if t in self.word_index]
        if not ids:
            return None

        n_iter = n_iter or config.INFER_ITER
        burn_in = min(burn_in if burn_in is not None else config.INFER_BURN_IN, n_iter - 1)
        n_topics = self.num_topics
        alpha = self.doc_topic_prior
        rng = np.random.default_rng(config.RANDOM_STATE)  # cố định -> kết quả ổn định

        phi_w = self.topic_word[:, ids].T.tolist()  # N x K
        z = rng.integers(n_topics, size=len(ids)).tolist()
        n_dk = [0] * n_topics
        for k in z:
            n_dk[k] += 1

        theta_sum = np.zeros(n_topics)
        samples = 0
        cumulative = [0.0] * n_topics
        for iteration in range(n_iter):
            uniforms = rng.random(len(ids)).tolist()
            for i in range(len(ids)):
                k = z[i]
                n_dk[k] -= 1
                pw = phi_w[i]
                total = 0.0
                for t in range(n_topics):
                    total += (n_dk[t] + alpha) * pw[t]
                    cumulative[t] = total
                k = _sample(cumulative, uniforms[i] * total, n_topics)
                z[i] = k
                n_dk[k] += 1
            if iteration >= burn_in:
                theta_sum += np.asarray(n_dk, dtype=np.float64) + alpha
                samples += 1

        theta = theta_sum / samples
        return theta / theta.sum()

    def predict(self, tokens):
        """Trả về (label_id, cosine, {label_id: cosine}) của nhãn chính, hoặc None nếu không đủ từ."""
        result = self.predict_labels(tokens)
        if result is None:
            return None
        selected, all_scores = result
        label_id = selected[0][0]
        return label_id, all_scores[label_id], all_scores

    def label_shares(self, theta):
        """Tỷ lệ nội dung của tài liệu thuộc từng nhãn.

        Phân tích theta thành tổ hợp không âm của các centroid nhãn
        (Non-negative Least Squares):  theta ≈ Σ_L w_L · centroid_L,  w_L >= 0
        rồi chuẩn hóa w về tổng 1. Ví dụ bài viết nửa Lập trình nửa Trí tuệ nhân tạo
        sẽ có tỷ lệ ≈ 0.5 / 0.5.
        """
        weights, _ = nnls(self.centroids.T, theta)
        total = weights.sum()
        if total <= 0:
            return np.full(len(self.label_ids), 1.0 / len(self.label_ids))
        return weights / total

    def predict_labels(self, tokens):
        """Chọn 1-2 nhãn cho tài liệu (KHÔNG bắt buộc phải có nhãn thứ 2).

        Trả về ([(label_id, share), ...], {label_id: cosine}) hoặc None nếu không đủ từ.
        - Nhãn 1: nhãn chiếm tỷ lệ nội dung lớn nhất (luôn được gán).
        - Nhãn 2: chỉ gán khi thỏa TẤT CẢ (xem config.SECOND_LABEL_*):
            share_2 >= SECOND_LABEL_MIN_SHARE          nhãn 2 chiếm đủ nhiều nội dung
            share_1 + share_2 >= SECOND_LABEL_MIN_COVERAGE  bài gần như chỉ thuộc 2 nhãn này
                (nội dung rải đều nhiều nhãn = mô hình không chắc chắn -> chỉ 1 nhãn)
            cosine(centroid_1, centroid_2) < SECOND_LABEL_MAX_CENTROID_SIM
            nhãn 2 có >= SECOND_LABEL_MIN_DOCS bài huấn luyện (centroid đáng tin cậy)
        """
        theta = self.infer_theta(tokens)
        if theta is None:
            return None
        theta_unit = theta / max(np.linalg.norm(theta), 1e-12)
        cosine = self._unit_centroids @ theta_unit
        all_scores = {label_id: round(float(s), 4) for label_id, s in zip(self.label_ids, cosine)}

        shares = self.label_shares(theta)
        order = np.argsort(shares)[::-1]
        first = int(order[0])
        selected = [(self.label_ids[first], round(float(shares[first]), 4))]
        if config.MAX_LABELS_PER_POST >= 2 and len(order) > 1:
            second = int(order[1])
            centroid_sim = float(self._unit_centroids[first] @ self._unit_centroids[second])
            if (
                shares[second] >= config.SECOND_LABEL_MIN_SHARE
                and shares[first] + shares[second] >= config.SECOND_LABEL_MIN_COVERAGE
                and centroid_sim < config.SECOND_LABEL_MAX_CENTROID_SIM
                and self.label_train_counts[second] >= config.SECOND_LABEL_MIN_DOCS
            ):
                selected.append((self.label_ids[second], round(float(shares[second]), 4)))
        return selected, all_scores

    def top_words(self, n=10):
        result = []
        for k, row in enumerate(self.topic_word):
            top = np.argsort(row)[::-1][:n]
            result.append(
                {"topic": k, "words": [[self.vocabulary[i], round(float(row[i]), 4)] for i in top]}
            )
        return result

    # ---------------------------------------------------------- persistence
    def to_document(self):
        return {
            "vocabulary": self.vocabulary,
            "topicWord": _to_bytes(self.topic_word),
            "centroids": _to_bytes(self.centroids),
            "docTopicPrior": self.doc_topic_prior,
            "labelIds": self.label_ids,
            "labelTrainCounts": self.label_train_counts,
            "numTopics": self.num_topics,
        }

    @classmethod
    def from_document(cls, doc):
        return cls(
            vocabulary=doc["vocabulary"],
            topic_word=_from_bytes(doc["topicWord"]),
            doc_topic_prior=doc["docTopicPrior"],
            label_ids=doc["labelIds"],
            centroids=_from_bytes(doc["centroids"]),
            label_train_counts=doc.get("labelTrainCounts"),
        )
