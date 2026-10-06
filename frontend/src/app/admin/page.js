'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import { 
  FiUsers, 
  FiFileText, 
  FiMessageSquare, 
  FiTag, 
  FiTrendingUp, 
  FiEye, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle,
  FiExternalLink
} from 'react-icons/fi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminAPI.getDashboard();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error('Fetch dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const { stats, recentPosts = [], recentUsers = [], postsByStatus = [] } = data || {};

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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-primary">Admin Tổng</span>;
      case 'admin_posts':
        return <span className="badge badge-info">Admin Bài viết</span>;
      case 'admin_support':
        return <span className="badge badge-warning">Admin CSKH</span>;
      default:
        return <span className="badge badge-success">Thành viên</span>;
    }
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
          Tổng quan hệ thống
        </h1>
        <p className="page-subtitle">
          Theo dõi số liệu người dùng, bài viết và hoạt động trên toàn nền tảng.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <FiUsers />
          </div>
          <div>
            <div className="stat-value">{stats?.totalUsers || 0}</div>
            <div className="stat-label">Tổng người dùng</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <FiFileText />
          </div>
          <div>
            <div className="stat-value">{stats?.totalPosts || 0}</div>
            <div className="stat-label">Tổng bài viết</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <FiMessageSquare />
          </div>
          <div>
            <div className="stat-value">{stats?.totalComments || 0}</div>
            <div className="stat-label">Tổng bình luận</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
            <FiTag />
          </div>
          <div>
            <div className="stat-value">{stats?.totalLabels || 0}</div>
            <div className="stat-label">Chủ đề & Nhãn</div>
          </div>
        </div>
      </div>

      {/* Post Status Overview */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Phân bố bài viết theo trạng thái
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {postsByStatus.map((item) => (
            <div 
              key={item._id}
              style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {getStatusBadge(item._id)}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {item.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tables Row: Recent Posts & Recent Users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* Recent Posts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              Bài viết gần đây
            </h3>
            <Link href="/admin/posts" style={{ fontSize: 13 }}>
              Xem tất cả →
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentPosts.map((post) => (
                <div
                  key={post._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    gap: 12
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/posts/${post.slug}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {post.title}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Bởi {post.author?.fullName || 'Ẩn danh'} • {format(new Date(post.createdAt), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(post.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có bài viết nào</p>
          )}
        </div>

        {/* Recent Users */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              Người dùng mới đăng ký
            </h3>
            <Link href="/admin/users" style={{ fontSize: 13 }}>
              Xem tất cả →
            </Link>
          </div>

          {recentUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentUsers.map((u) => (
                <div
                  key={u._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <img
                      src={u.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                      alt={u.fullName}
                      style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    {getRoleBadge(u.role)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có người dùng nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
