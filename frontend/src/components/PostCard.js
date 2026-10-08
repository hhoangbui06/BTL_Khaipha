'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { postAPI } from '@/lib/api';
import ShareModal from './ShareModal';
import { 
  FiHeart, 
  FiMessageSquare, 
  FiShare2, 
  FiEye, 
  FiCalendar, 
  FiCornerDownRight,
  FiTrash2,
  FiEdit2,
  FiMoreHorizontal
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function PostCard({ 
  post, 
  isShared = false, 
  shareNote = '', 
  sharedAt = null,
  onUnshare = null,
  onDelete = null,
  showActions = true 
}) {
  const { user } = useAuth();
  const router = useRouter();

  const isLikedByMe = user && post?.likes?.some(id => 
    (typeof id === 'string' ? id : id?._id) === user._id
  );

  const [liked, setLiked] = useState(isLikedByMe || false);
  const [likeCount, setLikeCount] = useState(post?.likeCount || post?.likes?.length || 0);
  const [shareCount, setShareCount] = useState(post?.shareCount || 0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu 3 chấm khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!post || deleted) return null;

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Vui lòng đăng nhập để thích bài viết');
      router.push('/login');
      return;
    }

    if (likeLoading) return;
    setLikeLoading(true);

    try {
      const { data } = await postAPI.toggleLike(post._id);
      if (data.success) {
        setLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      }
    } catch (error) {
      toast.error('Không thể thực hiện thao tác thích');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Vui lòng đăng nhập để chia sẻ bài viết');
      router.push('/login');
      return;
    }

    setShareModalOpen(true);
  };

  const handleDeleteFromMenu = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);

    // Trang cha tự xử lý xóa (vd: trang cá nhân cần tải lại tường)
    if (onDelete) {
      onDelete(post._id);
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa bài viết "${post.title}"?`)) return;

    setDeleting(true);
    try {
      const { data } = await postAPI.delete(post._id);
      if (data.success) {
        toast.success('Đã xóa bài viết');
        setDeleted(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa bài viết');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  };

  const isAuthorOrAdmin = user && (
    (post.author?._id === user._id || post.author === user._id) ||
    ['admin', 'admin_posts'].includes(user.role)
  );

  return (
    <>
      <div className="post-card">
        {/* Menu 3 chấm (tác giả hoặc admin) */}
        {isAuthorOrAdmin && !isShared && (
          <div className="post-card-menu" ref={menuRef}>
            <button
              type="button"
              className="post-card-menu-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Tùy chọn"
            >
              <FiMoreHorizontal />
            </button>

            {menuOpen && (
              <div className="post-card-menu-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="post-card-menu-item danger"
                  onClick={handleDeleteFromMenu}
                  disabled={deleting}
                >
                  <FiTrash2 /> {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Shared banner if this is a share on user's wall */}
        {isShared && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            color: '#60a5fa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCornerDownRight />
              <span>Đã chia sẻ {sharedAt ? `(${formatDate(sharedAt)})` : ''}</span>
              {shareNote && (
                <span style={{ color: 'var(--text-primary)', marginLeft: 8, fontStyle: 'italic' }}>
                  "{shareNote}"
                </span>
              )}
            </div>

            {onUnshare && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUnshare(post._id);
                }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', color: 'var(--error)', fontSize: 12 }}
                title="Gỡ khỏi trang cá nhân"
              >
                Gỡ bài chia sẻ
              </button>
            )}
          </div>
        )}

        {/* Thumbnail with Title Overlay */}
        <Link href={`/posts/${post.slug}`} className="post-card-thumbnail">
          {post.thumbnail ? (
            <img 
              src={post.thumbnail} 
              alt={post.title} 
              loading="lazy" 
            />
          ) : (
            <div className="post-card-thumbnail-placeholder">
              <span style={{ fontSize: 36, opacity: 0.4 }}>📝</span>
            </div>
          )}

          {/* Vignette / Gradient Overlay */}
          <div className="post-card-thumb-overlay" />

          {/* Floating category / label badge */}
          {post.labels && post.labels.length > 0 && (
            <div className="post-card-floating-badge">
              <span>{typeof post.labels[0] === 'object' ? post.labels[0].name : post.labels[0]}</span>
            </div>
          )}

          {/* Overlaid Title */}
          <div className="post-card-thumb-content">
            <h3 className="post-card-thumb-title">
              {post.title}
            </h3>
          </div>
        </Link>

        <div className="post-card-body">
          {/* Author and Date Meta */}
          <div className="post-card-meta">
            <Link 
              href={`/profile/${post.author?._id || post.author}`}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <img
                src={post.author?.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                alt={post.author?.fullName || 'Tác giả'}
                className="author-avatar"
              />
              <span className="author-name">{post.author?.fullName || 'Ẩn danh'}</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="post-date">{formatDate(post.createdAt)}</span>
          </div>

          {/* Excerpt */}
          <p className="post-card-excerpt">
            {post.excerpt || post.content?.replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
          </p>

          {/* Labels */}
          {post.labels && post.labels.length > 0 && (
            <div className="post-card-labels">
              {post.labels.map((lbl) => {
                const labelObj = typeof lbl === 'object' ? lbl : { name: lbl, color: '#6366f1' };
                return (
                  <span
                    key={labelObj._id || labelObj.name}
                    className="post-label"
                    style={{
                      background: `${labelObj.color || '#6366f1'}20`,
                      color: labelObj.color || '#818cf8',
                      border: `1px solid ${labelObj.color || '#6366f1'}40`
                    }}
                  >
                    #{labelObj.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Actions Footer */}
          {showActions && (
            <div className="post-card-actions">
              {/* Like */}
              <button
                type="button"
                onClick={handleLike}
                className={`action-btn ${liked ? 'liked' : ''}`}
                title={liked ? 'Bỏ thích' : 'Thích bài viết'}
              >
                <FiHeart style={{ fill: liked ? 'currentColor' : 'none' }} />
                <span>{likeCount}</span>
              </button>

              {/* Comment */}
              <Link
                href={`/posts/${post.slug}#comments`}
                className="action-btn"
                title="Bình luận"
              >
                <FiMessageSquare />
                <span>{post.commentCount || 0}</span>
              </Link>

              {/* Share */}
              <button
                type="button"
                onClick={handleShareClick}
                className="action-btn"
                title="Chia sẻ lên trang cá nhân"
              >
                <FiShare2 />
                <span>{shareCount}</span>
              </button>

              {/* Views */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginLeft: 'auto'
                }}
              >
                <FiEye />
                <span>{post.viewCount || 0}</span>
              </div>

              {/* Author/Admin quick actions */}
              {isAuthorOrAdmin && !isShared && (
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  <Link
                    href={`/posts/edit/${post._id}`}
                    className="action-btn"
                    style={{ padding: '6px 8px' }}
                    title="Chỉnh sửa bài viết"
                  >
                    <FiEdit2 />
                  </Link>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(post._id);
                      }}
                      className="action-btn"
                      style={{ padding: '6px 8px', color: 'var(--error)' }}
                      title="Xóa bài viết"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        post={post}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShareSuccess={(newCount) => setShareCount(newCount)}
      />
    </>
  );
}
