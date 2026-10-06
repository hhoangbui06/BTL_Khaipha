'use client';
import { useState } from 'react';
import { FiShare2, FiX, FiCheck } from 'react-icons/fi';
import { postAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ShareModal({ post, isOpen, onClose, onShareSuccess }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await postAPI.share(post._id, note.trim());
      if (data.success) {
        toast.success('Đã chia sẻ bài viết lên trang cá nhân thành công!');
        if (onShareSuccess) onShareSuccess(data.data.shareCount);
        onClose();
        setNote('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi chia sẻ bài viết');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiShare2 style={{ color: 'var(--share-color)', fontSize: 20 }} />
            <h3 className="modal-title">Chia sẻ lên trang cá nhân (Wall)</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Post preview */}
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'center'
            }}>
              {post.thumbnail && (
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)'
                }}>
                  {post.title}
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Tác giả: {post.author?.fullName || 'Ẩn danh'}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Thêm lời bình của bạn (không bắt buộc)
              </label>
              <textarea
                className="form-textarea"
                placeholder="Bạn nghĩ gì về bài viết này? Viết cảm nhận để bạn bè trên tường cùng đọc nhé..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', textAlign: 'right', marginTop: 4 }}>
                {note.length}/500 ký tự
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
