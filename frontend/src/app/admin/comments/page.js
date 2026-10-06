'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import Pagination from '@/components/Pagination';
import { FiSearch, FiTrash2, FiMessageSquare, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();

      const { data } = await adminAPI.getComments(params);
      if (data.success) {
        setComments(data.data.comments);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Fetch admin comments error:', error);
      toast.error('Không thể tải bình luận');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

    try {
      const { data } = await adminAPI.deleteComment(commentId);
      if (data.success) {
        toast.success('Đã xóa bình luận');
        fetchComments();
      }
    } catch (error) {
      toast.error('Không thể xóa bình luận');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
          Quản lý bình luận
        </h1>
        <p className="page-subtitle">
          Kiểm duyệt, tìm kiếm và xóa các bình luận vi phạm hoặc spam.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Tìm theo nội dung bình luận..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Comments Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : comments.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Người bình luận</th>
                <th>Bài viết</th>
                <th>Nội dung bình luận</th>
                <th>Thời gian</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={c.author?.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                        alt={c.author?.fullName}
                        style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {c.author?.fullName || 'Ẩn danh'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.author?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.post ? (
                      <Link
                        href={`/posts/${c.post.slug}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          maxWidth: 200,
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {c.post.title}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Bài viết đã xóa</span>
                    )}
                  </td>
                  <td>
                    <div style={{
                      maxWidth: 320,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {c.content}
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c._id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px 10px' }}
                      title="Xóa bình luận"
                    >
                      <FiTrash2 /> Xóa
                    </button>
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
          <p>Không có bình luận nào.</p>
        </div>
      )}
    </div>
  );
}
