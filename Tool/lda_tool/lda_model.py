"""Mô hình LDA dùng để gán nhãn bài viết.

Ý tưởng:
1. Huấn luyện LDA (Latent Dirichlet Allocation, Variational Bayes - scikit-learn)
   trên các bài viết ĐÃ có nhãn, thu được K chủ đề, mỗi chủ đề là một phân phối
   xác suất trên từ vựng (beta).
2. Với mỗi bài viết d suy luận phân phối chủ đề theta_d (K chiều).
3. Mỗi nhãn L được biểu diễn bằng "centroid chủ đề" = trung bình theta của các
   bài thuộc nhãn L.
4. Bài viết mới chưa có nhãn: suy luận theta_new rồi gán nhãn có độ tương đồng
   cosine(theta_new, centroid_L) lớn nhất (mỗi bài gán đúng 1 nhãn).

Phần suy luận theta được tự cài đặt bằng numpy (E-step của Variational Bayes)
để mô hình có thể lưu dưới dạng mảng số vào MongoDB mà không phụ thuộc vào
phiên bản pickle của scikit-learn.
"""
import io
from collections import Counter

import numpy as np
from scipy.special import psi
from sklearn.decomposition import LatentDirichletAllocation
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


class LdaLabeler:
    def __init__(self, vocabulary, topic_word, doc_topic_prior, label_ids, centroids):
        self.vocabulary = list(vocabulary)
        self.word_index = {w: i for i, w in enumerate(self.vocabulary)}
        self.topic_word = np.asarray(topic_word, dtype=np.float64)  # lambda (K x V)
        self.doc_topic_prior = float(doc_topic_prior)
        self.label_ids = list(label_ids)
        self.centroids = np.asarray(centroids, dtype=np.float64)  # (L x K)

        # E[log beta] theo phân phối Dirichlet hậu nghiệm của từng chủ đề
        elog_beta = psi(self.topic_word) - psi(self.topic_word.sum(axis=1))[:, None]
        self._exp_elog_beta = np.exp(elog_beta)
        norms = np.linalg.norm(self.centroids, axis=1, keepdims=True)
        self._unit_centroids = self.centroids / np.maximum(norms, 1e-12)

    @property
    def num_topics(self):
        return self.topic_word.shape[0]

    # ------------------------------------------------------------------ train
    @classmethod
    def train(cls, documents, document_labels, label_ids, num_topics=None):
        """documents: list[list[str]]; document_labels: list[list[label_id]]."""
        n_topics = num_topics or config.NUM_TOPICS or len(label_ids)
        n_topics = max(int(n_topics), 2)
        alpha = config.DOC_TOPIC_PRIOR if config.DOC_TOPIC_PRIOR > 0 else 1.0 / n_topics

        vectorizer = CountVectorizer(
            analyzer=_identity,
            max_df=0.95 if len(documents) >= 20 else 1.0,
            min_df=2 if len(documents) >= 50 else 1,
            max_features=config.MAX_FEATURES,
        )
        counts = vectorizer.fit_transform(documents)

        lda = LatentDirichletAllocation(
            n_components=n_topics,
            doc_topic_prior=alpha,
            topic_word_prior=config.TOPIC_WORD_PRIOR,
            learning_method="batch",
            max_iter=config.MAX_ITER,
            random_state=config.RANDOM_STATE,
        )
        lda.fit(counts)

        model = cls(
            vocabulary=vectorizer.get_feature_names_out(),
            topic_word=lda.components_,
            doc_topic_prior=alpha,
            label_ids=label_ids,
            centroids=np.zeros((len(label_ids), n_topics)),
        )

        # Centroid chủ đề của từng nhãn
        sums = np.zeros((len(label_ids), n_topics))
        totals = np.zeros(len(label_ids))
        position = {label_id: i for i, label_id in enumerate(label_ids)}
        for tokens, labels in zip(documents, document_labels):
            theta = model.infer_theta(tokens)
            if theta is None:
                continue
            for label_id in labels:
                if label_id in position:
                    sums[position[label_id]] += theta
                    totals[position[label_id]] += 1
        centroids = sums / np.maximum(totals, 1)[:, None]
        model = cls(model.vocabulary, model.topic_word, alpha, label_ids, centroids)
        model.perplexity = float(lda.perplexity(counts))
        return model

    # -------------------------------------------------------------- inference
    def infer_theta(self, tokens, max_iter=200, tol=1e-4):
        """Suy luận phân phối chủ đề theta của một tài liệu (VB E-step)."""
        counter = Counter(t for t in tokens if t in self.word_index)
        if not counter:
            return None
        ids = np.fromiter((self.word_index[w] for w in counter), dtype=np.int64)
        cnts = np.fromiter(counter.values(), dtype=np.float64)

        exp_elog_beta_d = self._exp_elog_beta[:, ids]  # K x N
        gamma = np.ones(self.num_topics)
        exp_elog_theta = np.exp(psi(gamma) - psi(gamma.sum()))
        for _ in range(max_iter):
            last_gamma = gamma
            phi_norm = exp_elog_theta @ exp_elog_beta_d + 1e-100
            gamma = self.doc_topic_prior + exp_elog_theta * ((cnts / phi_norm) @ exp_elog_beta_d.T)
            exp_elog_theta = np.exp(psi(gamma) - psi(gamma.sum()))
            if np.mean(np.abs(gamma - last_gamma)) < tol:
                break
        return gamma / gamma.sum()

    def predict(self, tokens):
        """Trả về (label_id, score, {label_id: score}) hoặc None nếu không đủ từ."""
        theta = self.infer_theta(tokens)
        if theta is None:
            return None
        theta_unit = theta / max(np.linalg.norm(theta), 1e-12)
        scores = self._unit_centroids @ theta_unit
        best = int(np.argmax(scores))
        all_scores = {label_id: round(float(s), 4) for label_id, s in zip(self.label_ids, scores)}
        return self.label_ids[best], round(float(scores[best]), 4), all_scores

    def top_words(self, n=10):
        beta = self.topic_word / self.topic_word.sum(axis=1, keepdims=True)
        result = []
        for k, row in enumerate(beta):
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
        )
