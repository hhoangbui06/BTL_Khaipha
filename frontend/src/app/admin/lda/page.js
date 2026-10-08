'use client';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { FiRefreshCw, FiCpu, FiPlay, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminLdaPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const [testTitle, setTestTitle] = useState('');
  const [testContent, setTestContent] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getLdaStatus();
      if (data.success) setStatus(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể kết nối LDA Tool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async (force) => {
    setSyncing(true);
    try {
      const { data } = await adminAPI.syncLda(force);
      if (data.success) {
        setLastSync(data.data);
        if (data.data.ready) {
          toast.success(`Đồng bộ xong: gán nhãn ${data.data.labeled.length} bài viết`);
        } else {
          toast.error(data.data.reason || 'Chưa đủ dữ liệu để huấn luyện');
        }
        fetchStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!testTitle.trim() && !testContent.trim()) return;
    setPredicting(true);
    try {
      const { data } = await adminAPI.predictLda({ title: testTitle, content: testContent });
      if (data.success) setPrediction(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dự đoán thất bại');
    } finally {
      setPredicting(false);
    }
  };

  const model = status?.model || {};
  const info = status?.data || {};

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
            Tự động gán nhãn (LDA)
          </h1>
          <p className="page-subtitle">
            Tool học từ tiêu đề và nội dung chữ (bỏ qua ảnh) của các bài viết đã có nhãn, rồi tự gán
            1–2 nhãn cho bài viết chưa có nhãn (nhãn thứ 2 chỉ được gán khi chiếm ≥ 20% nội dung). Bài đã có nhãn được giữ nguyên.
            Tool tự huấn luyện lại khi bài viết hoặc nhãn thay đổi.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={fetchStatus} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleSync(true)} disabled={syncing}>
            <FiCpu /> Huấn luyện lại
          </button>
          <button type="button" className="btn btn-primary" onClick={() => handleSync(false)} disabled={syncing}>
            <FiPlay /> {syncing ? 'Đang chạy...' : 'Đồng bộ ngay'}
          </button>
        </div>
      </div>

      {loading && !status ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : status ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Trạng thái mô hình</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                {model.ready ? (
                  <span className="badge badge-success">Sẵn sàng</span>
                ) : (
                  <span className="badge badge-warning">Chưa sẵn sàng</span>
                )}
                {model.stale && <span className="badge badge-info" style={{ marginLeft: 6 }}>Dữ liệu đã đổi</span>}
              </div>
              {model.reason && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{model.reason}</p>}
            </div>
            <div className="card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Huấn luyện lần cuối</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                {model.trainedAt ? format(new Date(model.trainedAt), 'HH:mm dd/MM/yyyy') : '—'}
              </div>
              {model.stats?.perplexity && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  K = {model.numTopics} chủ đề • {model.stats.vocabularySize} từ • perplexity {model.stats.perplexity}
                </p>
              )}
            </div>
            <div className="card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dữ liệu huấn luyện</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{info.trainingPosts} bài viết</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {info.excludedImagePosts > 0
                  ? `Loại ${info.excludedImagePosts} bài có ảnh`
                  : 'Chỉ đọc tiêu đề + nội dung chữ, bỏ qua ảnh'}
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bài viết</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{info.autoLabeledPosts} bài tự gán nhãn</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {info.unlabeledPosts} bài chưa có nhãn
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Nhãn dùng để huấn luyện</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(info.trainableLabels || []).map((l) => (
                <span key={l.id} className="badge badge-primary">{l.name} • {l.posts} bài</span>
              ))}
              {(info.skippedLabels || []).map((l) => (
                <span key={l.id} className="badge" title="Chưa có bài viết hợp lệ" style={{ opacity: 0.6, border: '1px dashed var(--border-color)' }}>
                  {l.name} • bỏ qua
                </span>
              ))}
            </div>
          </div>

          {model.topics?.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12 }}>Các chủ đề LDA (top từ khóa)</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Chủ đề</th>
                    <th>Từ khóa tiêu biểu</th>
                  </tr>
                </thead>
                <tbody>
                  {model.topics.map((t) => (
                    <tr key={t.topic}>
                      <td>#{t.topic + 1}</td>
                      <td style={{ fontSize: 13 }}>{t.words.map(([w]) => w.replace(/_/g, ' ')).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastSync?.labeled?.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12 }}>Kết quả đồng bộ gần nhất</h3>
              <ul style={{ paddingLeft: 18, fontSize: 14 }}>
                {lastSync.labeled.map((r) => (
                  <li key={r.postId}>
                    {r.skipped ? `${r.postId}: ${r.skipped}` : `${r.title} → ${r.labelName} (${r.score})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}><FiZap /> Thử dự đoán nhãn</h3>
        <form onSubmit={handlePredict}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Tiêu đề..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Nội dung..."
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={predicting}>
            {predicting ? 'Đang dự đoán...' : 'Dự đoán'}
          </button>
        </form>

        {prediction && (
          <div style={{ marginTop: 16 }}>
            {prediction.label ? (
              <>
                <p>
                  Nhãn dự đoán:{' '}
                  {(prediction.labels || [prediction.label]).map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && ' + '}
                      <strong>{l.name}</strong>
                      {l.share !== undefined && ` (${Math.round(l.share * 100)}% nội dung)`}
                    </span>
                  ))}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Độ tương đồng cosine với từng nhãn:
                </p>
                <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                  {prediction.scores.map((s) => (
                    <li key={s.id}>{s.name}: {s.score}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>{prediction.reason}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
