'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminAPI, labelAPI } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  FiSearch,
  FiTrash2,
  FiEdit,
  FiEye,
  FiStar,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiTag,
  FiX,
  FiPlus
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

  // Gán nhãn (admin có thể tạo nhãn mới ngay tại đây)
  const [allLabels, setAllLabels] = useState([]);
  const [labelPost, setLabelPost] = useState(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [newLabels, setNewLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [savingLabels, setSavingLabels] = useState(false);

  const fetchLabels = async () => {
    try {
      const { data } = await labelAPI.getAll();
      if (data.success) setAllLabels(data.data);
    } catch (error) {
      console.error('Fetch labels error:', error);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const openLabelModal = (post) => {
    setLabelPost(post);
    setSelectedLabelIds((post.labels || []).map(l => (typeof l === 'object' ? l._id : l)));
    setNewLabels([]);
    setNewLabelName('');
  };

  const toggleLabel = (id) => {
    setSelectedLabelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addNewLabel = () => {
    const name = newLabelName.trim();
    if (!name) return;
    const existing = allLabels.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedLabelIds.includes(existing._id)) toggleLabel(existing._id);
    } else if (!newLabels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      setNewLabels(prev => [...prev, { name, color: newLabelColor }]);
    }
    setNewLabelName('');
  };

  const handleSaveLabels = async () => {
    setSavingLabels(true);
    try {
      const { data } = await adminAPI.setPostLabels(labelPost._id, {
        labelIds: selectedLabelIds,
        newLabels
      });
      if (data.success) {
        toast.success(
          selectedLabelIds.length === 0 && newLabels.length === 0
            ? 'Đã bỏ toàn bộ nhãn của bài viết'
            : 'Đã gán nhãn cho bài viết'
        );
        setPosts(prev => prev.map(p => p._id === labelPost._id ? { ...p, ...data.data } : p));
        setLabelPost(null);
        if (newLabels.length > 0) fetchLabels();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gán nhãn');
    } finally {
      setSavingLabels(false);
    }
  };

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
                <th>Nhãn</th>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', maxWidth: 220 }}>
                      {(post.labels || []).map((lbl) => (
                        <span
                          key={lbl._id}
                          className="post-label"
                          style={{ background: `${lbl.color}20`, color: lbl.color, border: `1px solid ${lbl.color}40`, fontSize: 11 }}
                        >
                          #{lbl.name}
                        </span>
                      ))}
                      {post.autoLabeled && (
                        <span
                          className="badge badge-info"
                          style={{ fontSize: 10, padding: '2px 8px' }}
                          title={`Nhãn do LDA Tool tự gán (độ tương đồng ${post.autoLabelScore ?? '?'})`}
                        >
                          🤖 Tự động
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openLabelModal(post)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title="Gán nhãn"
                      >
                        <FiTag /> Gán
                      </button>
                    </div>
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

      {/* Label Assign Modal */}
      {labelPost && (
        <div className="modal-overlay" onClick={() => setLabelPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Gán nhãn bài viết</h3>
              <button type="button" className="modal-close" onClick={() => setLabelPost(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontWeight: 600, marginBottom: 16 }}>{labelPost.title}</p>

              <div className="form-group">
                <label className="form-label">Chọn nhãn có sẵn</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {allLabels.map((lbl) => {
                    const active = selectedLabelIds.includes(lbl._id);
                    return (
                      <button
                        key={lbl._id}
                        type="button"
                        onClick={() => toggleLabel(lbl._id)}
                        className="post-label"
                        style={{
                          cursor: 'pointer',
                          background: active ? lbl.color : `${lbl.color}15`,
                          color: active ? '#fff' : lbl.color,
                          border: `1px solid ${lbl.color}60`,
                          padding: '4px 12px'
                        }}
                      >
                        #{lbl.name}
                      </button>
                    );
                  })}
                  {newLabels.map((lbl) => (
                    <span
                      key={lbl.name}
                      className="post-label"
                      style={{ background: lbl.color, color: '#fff', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      #{lbl.name} (mới)
                      <FiX
                        style={{ cursor: 'pointer' }}
                        onClick={() => setNewLabels(prev => prev.filter(l => l.name !== lbl.name))}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thêm nhãn mới</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tên nhãn mới..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewLabel(); } }}
                  />
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    style={{ width: 44, height: 42, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addNewLabel}>
                    <FiPlus /> Thêm
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setLabelPost(null)} disabled={savingLabels}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveLabels} disabled={savingLabels}>
                {savingLabels ? 'Đang lưu...' : 'Lưu nhãn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
