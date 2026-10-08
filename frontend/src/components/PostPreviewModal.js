'use client';
import { useEffect, useRef } from 'react';
import { FiX, FiEye, FiHeart, FiShare2, FiExternalLink } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const DEFAULT_AVATAR = 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
  } catch {
    return '';
  }
};

// Cửa sổ xem toàn bộ bài viết (giao diện giống trang /posts/[slug])
export default function PostPreviewModal({ post, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  if (!post) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content post-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={post.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Xem bài viết</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {post.slug && (
              <a
                href={`/posts/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                title="Mở trang bài viết trong tab mới"
              >
                <FiExternalLink /> Mở trang
              </a>
            )}
            <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
              <FiX />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <article className="post-detail">
            {post.labels && post.labels.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {post.labels.map((lbl) => (
                  <span
                    key={lbl._id || lbl.name}
                    className="post-label"
                    style={{
                      background: `${lbl.color || '#6366f1'}20`,
                      color: lbl.color || '#818cf8',
                      border: `1px solid ${lbl.color || '#6366f1'}40`,
                      fontSize: 12,
                      padding: '4px 12px'
                    }}
                  >
                    #{lbl.name}
                  </span>
                ))}
              </div>
            )}

            <h1 className="post-detail-title">{post.title}</h1>

            <div className="post-detail-meta" style={{ marginBottom: 28 }}>
              <div className="post-detail-author">
                <img src={post.author?.avatar || DEFAULT_AVATAR} alt={post.author?.fullName || 'Tác giả'} />
                <div className="post-detail-author-info">
                  <h4>{post.author?.fullName || 'Ẩn danh'}</h4>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiEye /> {post.viewCount || 0} lượt xem
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiHeart /> {post.likes?.length || 0} thích
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiShare2 /> {post.shareCount || 0} chia sẻ
                </span>
              </div>
            </div>

            {post.thumbnail && (
              <div className="post-detail-thumbnail">
                <img src={post.thumbnail} alt={post.title} />
              </div>
            )}

            <div
              className="post-detail-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        </div>
      </div>
    </div>
  );
}
