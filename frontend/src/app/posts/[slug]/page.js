'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ShareModal from '@/components/ShareModal';
import { useAuth } from '@/context/AuthContext';
import { postAPI, commentAPI } from '@/lib/api';
import { 
  FiHeart, 
  FiShare2, 
  FiMessageSquare, 
  FiEye, 
  FiCalendar, 
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiCornerDownRight,
  FiSend,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function PostDetailPage() {
  const [askConfirm, confirmElement] = useConfirm();
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null); // comment id being replied to
  const [replyContent, setReplyContent] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  // Fetch post
  const fetchPost = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await postAPI.getBySlug(slug);
      if (data.success) {
        setPost(data.data);
        setLikeCount(data.data.likeCount || data.data.likes?.length || 0);
        setShareCount(data.data.shareCount || 0);
        if (user && data.data.likes) {
          const hasLiked = data.data.likes.some(id => (typeof id === 'string' ? id : id?._id) === user._id);
          setLiked(hasLiked);
        }
      }
    } catch (error) {
      console.error('Fetch post error:', error);
      toast.error('Không tìm thấy bài viết');
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  // Fetch comments
  const fetchComments = useCallback(async (postId) => {
    try {
      const { data } = await commentAPI.getByPost(postId);
      if (data.success) {
        setComments(data.data.comments);
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  }, []);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    if (post?._id) {
      fetchComments(post._id);
    }
  }, [post?._id, fetchComments]);

  // Toggle Like Post
  const handleLikePost = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thích bài viết');
      router.push(`/login?redirect=/posts/${slug}`);
      return;
    }

    try {
      const { data } = await postAPI.toggleLike(post._id);
      if (data.success) {
        setLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      }
    } catch (error) {
      toast.error('Lỗi khi thích bài viết');
    }
  };

  // Submit comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để bình luận');
      router.push(`/login?redirect=/posts/${slug}`);
      return;
    }

    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const { data } = await commentAPI.create({
        postId: post._id,
        content: newComment.trim()
      });
      if (data.success) {
        toast.success('Đã gửi bình luận');
        setNewComment('');
        fetchComments(post._id);
      }
    } catch (error) {
      toast.error('Lỗi khi gửi bình luận');
    } finally {
      setCommentLoading(false);
    }
  };

  // Submit reply
  const handleSubmitReply = async (parentCommentId) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để trả lời bình luận');
      router.push(`/login?redirect=/posts/${slug}`);
      return;
    }

    if (!replyContent.trim()) return;

    try {
      const { data } = await commentAPI.create({
        postId: post._id,
        content: replyContent.trim(),
        parentComment: parentCommentId
      });
      if (data.success) {
        toast.success('Đã trả lời bình luận');
        setReplyTo(null);
        setReplyContent('');
        fetchComments(post._id);
      }
    } catch (error) {
      toast.error('Lỗi khi trả lời bình luận');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!(await askConfirm({
      title: 'Xóa bình luận?',
      message: 'Bình luận này sẽ bị xóa. Bạn có chắc chắn muốn xóa?',
      confirmText: 'Xóa',
      danger: true
    }))) return;

    try {
      const { data } = await commentAPI.delete(commentId);
      if (data.success) {
        toast.success('Đã xóa bình luận');
        fetchComments(post._id);
      }
    } catch (error) {
      toast.error('Lỗi khi xóa bình luận');
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      const { data } = await postAPI.delete(post._id);
      if (data.success) {
        toast.success('Đã xóa bài viết thành công');
        setConfirmDeleteOpen(false);
        router.push('/');
      }
    } catch (error) {
      toast.error('Không thể xóa bài viết');
    } finally {
      setDeletingPost(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div className="loading-spinner" style={{ flex: 1 }}>
          <div className="spinner" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div className="page-container" style={{ flex: 1, textAlign: 'center', padding: '100px 20px' }}>
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>Bài viết không tồn tại</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Bài viết có thể đã bị gỡ bỏ hoặc đường dẫn không chính xác.
          </p>
          <Link href="/" className="btn btn-primary">
            Quay lại trang chủ
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isAuthorOrAdmin = user && (
    (post.author?._id === user._id) ||
    ['admin', 'admin_posts'].includes(user.role)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="page-container">
          <article className="post-detail">
            {/* Back link */}
            <Link 
              href="/" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-muted)',
                fontSize: 14,
                marginBottom: 24
              }}
            >
              <FiArrowLeft /> Quay lại danh sách
            </Link>

            {/* Labels */}
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

            {/* Title */}
            <h1 className="post-detail-title">
              {post.title}
            </h1>

            {/* Post Meta */}
            <div className="post-detail-meta" style={{ marginBottom: 28 }}>
              <Link 
                href={`/profile/${post.author?._id}`}
                className="post-detail-author"
                style={{ textDecoration: 'none' }}
              >
                <img
                  src={post.author?.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                  alt={post.author?.fullName || 'Tác giả'}
                />
                <div className="post-detail-author-info">
                  <h4>{post.author?.fullName || 'Ẩn danh'}</h4>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiEye /> {post.viewCount} lượt xem
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiHeart /> {likeCount} thích
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiShare2 /> {shareCount} chia sẻ
                </span>
              </div>
            </div>

            {/* Thumbnail */}
            {post.thumbnail && (
              <div className="post-detail-thumbnail">
                <img src={post.thumbnail} alt={post.title} />
              </div>
            )}

            {/* Post Content */}
            <div
              className="post-detail-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Action Bar */}
            <div className="post-detail-actions">
              <button
                type="button"
                onClick={handleLikePost}
                className={`action-btn ${liked ? 'liked' : ''}`}
                style={{ fontSize: 15, padding: '10px 18px' }}
              >
                <FiHeart style={{ fill: liked ? 'currentColor' : 'none', fontSize: 20 }} />
                <span>{likeCount} Thích</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.error('Vui lòng đăng nhập để chia sẻ bài viết');
                    router.push(`/login?redirect=/posts/${slug}`);
                  } else {
                    setShareModalOpen(true);
                  }
                }}
                className="action-btn"
                style={{ fontSize: 15, padding: '10px 18px' }}
              >
                <FiShare2 style={{ fontSize: 20 }} />
                <span>{shareCount} Chia sẻ lên tường</span>
              </button>

              {isAuthorOrAdmin && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <Link
                    href={`/posts/edit/${post._id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <FiEdit /> Sửa bài viết
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="btn btn-danger btn-sm"
                  >
                    <FiTrash2 /> Xóa
                  </button>
                </div>
              )}
            </div>

            {/* Author Bio Card */}
            {post.author && (
              <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 32
              }}>
                <img
                  src={post.author.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                  alt={post.author.fullName}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                    border: '2px solid var(--accent-primary)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                      Viết bởi {post.author.fullName}
                    </h3>
                    <Link
                      href={`/profile/${post.author._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <FiUser /> Xem trang cá nhân
                    </Link>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {post.author.bio || 'Tác giả chưa cập nhật tiểu sử.'}
                  </p>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <section id="comments" className="comments-section">
              <h3 className="comments-title">
                Bình luận ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
              </h3>

              {/* Comment Input */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="comment-form">
                  <textarea
                    placeholder="Viết bình luận hoặc đóng góp ý kiến của bạn..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                  />
                  <div className="comment-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={commentLoading}
                    >
                      <FiSend /> {commentLoading ? 'Đang gửi...' : 'Đăng bình luận'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{
                  padding: 24,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  marginBottom: 32
                }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Bạn cần đăng nhập để tham gia thảo luận và bình luận bài viết này.
                  </p>
                  <Link href={`/login?redirect=/posts/${slug}#comments`} className="btn btn-primary btn-sm">
                    Đăng nhập để bình luận
                  </Link>
                </div>
              )}

              {/* Comments List */}
              {comments.length > 0 ? (
                <div>
                  {comments.map((comment) => {
                    const isCommentAuthorOrAdmin = user && (
                      (comment.author?._id === user._id) ||
                      ['admin', 'admin_posts'].includes(user.role)
                    );

                    return (
                      <div key={comment._id} className="comment-item">
                        <img
                          src={comment.author?.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                          alt={comment.author?.fullName || 'Người dùng'}
                          className="comment-avatar"
                        />
                        <div className="comment-body">
                          <div className="comment-header">
                            <Link 
                              href={`/profile/${comment.author?._id}`}
                              className="comment-author"
                            >
                              {comment.author?.fullName || 'Ẩn danh'}
                            </Link>
                            <span className="comment-date">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>

                          <div className="comment-content">
                            {comment.content}
                          </div>

                          {/* Action row */}
                          <div className="comment-actions">
                            <button
                              type="button"
                              onClick={() => {
                                if (replyTo === comment._id) {
                                  setReplyTo(null);
                                } else {
                                  setReplyTo(comment._id);
                                  setReplyContent('');
                                }
                              }}
                              className="action-btn"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            >
                              <FiCornerDownRight /> Trả lời
                            </button>

                            {isCommentAuthorOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment._id)}
                                className="action-btn"
                                style={{ padding: '4px 8px', fontSize: 12, color: 'var(--error)' }}
                              >
                                <FiTrash2 /> Xóa
                              </button>
                            )}
                          </div>

                          {/* Inline Reply Form */}
                          {replyTo === comment._id && (
                            <div className="comment-reply-form">
                              <textarea
                                className="form-textarea"
                                style={{ minHeight: 60 }}
                                placeholder={`Trả lời @${comment.author?.fullName}...`}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setReplyTo(null)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSubmitReply(comment._id)}
                                  className="btn btn-primary btn-sm"
                                >
                                  Gửi trả lời
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Nested Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="replies">
                              {comment.replies.map((reply) => {
                                const isReplyAuthorOrAdmin = user && (
                                  (reply.author?._id === user._id) ||
                                  ['admin', 'admin_posts'].includes(user.role)
                                );

                                return (
                                  <div key={reply._id} className="comment-item" style={{ borderBottom: 'none', padding: '10px 0' }}>
                                    <img
                                      src={reply.author?.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                                      alt={reply.author?.fullName}
                                      className="comment-avatar"
                                      style={{ width: 30, height: 30 }}
                                    />
                                    <div className="comment-body">
                                      <div className="comment-header">
                                        <Link 
                                          href={`/profile/${reply.author?._id}`}
                                          className="comment-author"
                                        >
                                          {reply.author?.fullName || 'Ẩn danh'}
                                        </Link>
                                        <span className="comment-date">
                                          {formatDate(reply.createdAt)}
                                        </span>
                                      </div>
                                      <div className="comment-content">
                                        {reply.content}
                                      </div>
                                      {isReplyAuthorOrAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(reply._id)}
                                          className="action-btn"
                                          style={{ padding: '2px 6px', fontSize: 11, color: 'var(--error)', marginTop: 4 }}
                                        >
                                          <FiTrash2 /> Xóa
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Chưa có bình luận nào. Hãy là người đầu tiên để lại ý kiến!
                </div>
              )}
            </section>
          </article>
        </div>
      </main>

      <Footer />

      {/* Share Modal */}
      <ShareModal
        post={post}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShareSuccess={(newCount) => setShareCount(newCount)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Xóa bài viết?"
        message={`Bài viết "${post.title}" sẽ bị xóa và không còn hiển thị với mọi người. Bạn có chắc chắn muốn xóa?`}
        confirmText="Xóa"
        danger
        loading={deletingPost}
        onConfirm={handleDeletePost}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {confirmElement}
    </div>
  );
}
