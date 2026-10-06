'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import Pagination from '@/components/Pagination';
import { 
  FiSearch, 
  FiTrash2, 
  FiEdit, 
  FiEye, 
  FiStar, 
  FiCheckCircle, 
  FiXCircle,
  FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const { data } = await adminAPI.getPosts(params);
      if (data.success) {
        setPosts(data.data.posts);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Fetch admin posts error:', error);
      toast.error('Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const { data } = await adminAPI.updatePost(postId, { status: newStatus });
      if (data.success) {
        toast.success(`Đã chuyển trạng thái sang "${newStatus}"`);
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, status: newStatus } : p));
      }
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleToggleFeatured = async (postId, currentFeatured) => {
    try {
      const { data } = await adminAPI.updatePost(postId, { featured: !currentFeatured });
      if (data.success) {
        toast.success(currentFeatured ? 'Đã gỡ bài viết nổi bật' : 'Đã ghim bài viết nổi bật');
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, featured: !currentFeatured } : p));
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này vĩnh viễn khỏi danh sách hiển thị?')) return;

    try {
      const { data } = await adminAPI.deletePost(postId);
      if (data.success) {
        toast.success('Đã xóa bài viết');
        fetchPosts();
      }
    } catch (error) {
      toast.error('Không thể xóa bài viết');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="badge badge-success">Đã xuất bản</span>;
      case 'pending':
        return <span className="badge badge-warning">Chờ duyệt</span>;
      case 'draft':
        return <span className="badge badge-info">Bản nháp</span>;
      case 'rejected':
        return <span className="badge badge-error">Từ chối</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
            Quản lý bài viết
          </h1>
          <p className="page-subtitle">
            Duyệt bài, biên tập, ghim bài nổi bật và kiểm duyệt nội dung.
          </p>
        </div>

        <Link href="/posts/create" className="btn btn-primary">
          + Viết bài mới
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Tìm kiếm bài viết..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="pending">Chờ duyệt</option>
          <option value="draft">Bản nháp</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      {/* Posts Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : posts.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Ảnh</th>
                <th>Tiêu đề & Tác giả</th>
                <th>Trạng thái</th>
                <th>Nổi bật</th>
                <th>Thống kê</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt=""
                        style={{ width: 64, height: 42, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: 64, height: 42, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        📄
                      </div>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/posts/${post.slug}`}
                      style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}
                    >
                      {post.title}
                    </Link>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Tác giả: {post.author?.fullName || 'Ẩn danh'} ({post.author?.email})
                    </span>
                  </td>
                  <td>
                    <select
                      value={post.status}
                      onChange={(e) => handleStatusChange(post._id, e.target.value)}
                      className="filter-select"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <option value="published">Đã xuất bản</option>
                      <option value="pending">Chờ duyệt</option>
                      <option value="draft">Bản nháp</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(post._id, post.featured)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: post.featured ? '#fbbf24' : 'var(--text-muted)' }}
                      title={post.featured ? 'Bài viết nổi bật' : 'Đặt làm nổi bật'}
                    >
                      <FiStar style={{ fill: post.featured ? 'currentColor' : 'none' }} />
                    </button>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      👁️ {post.viewCount || 0} • ❤️ {post.likes?.length || 0} • 🔄 {post.shareCount || 0}
                    </div>
                  </td>
                  <td>{format(new Date(post.createdAt), 'dd/MM/yyyy')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px' }}
                        title="Xem bài viết"
                      >
                        <FiEye />
                      </Link>
                      <Link
                        href={`/posts/edit/${post._id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px' }}
                        title="Sửa bài viết"
                      >
                        <FiEdit />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post._id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 8px' }}
                        title="Xóa bài viết"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <div className="empty-state">
          <p>Không có bài viết nào phù hợp.</p>
        </div>
      )}
    </div>
  );
}
