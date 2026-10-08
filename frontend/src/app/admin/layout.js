'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  FiHome, 
  FiPieChart, 
  FiUsers, 
  FiFileText, 
  FiMessageSquare, 
  FiTag, 
  FiLogOut, 
  FiExternalLink,
  FiBookOpen,
  FiShield,
  FiKey,
  FiCpu
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!loading && !isLoginPage) {
      if (!user) {
        router.push('/admin/login');
      } else if (!['admin', 'admin_posts', 'admin_support'].includes(user.role)) {
        toast.error('Vui lòng kiểm tra tài khoản hoặc mật khẩu');
        router.push('/admin/login');
      }
    }
  }, [user, loading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !user || !['admin', 'admin_posts', 'admin_support'].includes(user.role)) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const role = user.role;

  const handleLogout = async () => {
    await logout();
    toast.success('Đã đăng xuất');
    router.push('/');
  };

  const getRoleName = () => {
    switch (role) {
      case 'admin': return 'Admin Tổng';
      case 'admin_posts': return 'Admin Bài Viết';
      case 'admin_support': return 'Admin CSKH';
      default: return 'Admin';
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar-logo">
          <FiBookOpen style={{ fontSize: 22 }} />
          <span style={{ color: '#a78bfa' }}>Admin</span>
        </Link>

        {/* Current Admin Tag */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={user.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
              alt={user.fullName}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName}
              </h4>
              <span className="badge badge-primary" style={{ fontSize: 10, padding: '2px 8px' }}>
                {getRoleName()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="admin-nav-section">
          <div className="admin-nav-title">Hệ thống</div>
          <Link
            href="/admin"
            className={`admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}
          >
            <FiPieChart /> Tổng quan
          </Link>
        </div>

        <div className="admin-nav-section">
          <div className="admin-nav-title">Quản lý nội dung</div>
          
          {/* Post management: admin, admin_posts */}
          {['admin', 'admin_posts'].includes(role) && (
            <Link
              href="/admin/posts"
              className={`admin-nav-link ${pathname.startsWith('/admin/posts') ? 'active' : ''}`}
            >
              <FiFileText /> Quản lý bài viết
            </Link>
          )}

          {/* Comment management: all admin roles */}
          <Link
            href="/admin/comments"
            className={`admin-nav-link ${pathname.startsWith('/admin/comments') ? 'active' : ''}`}
          >
            <FiMessageSquare /> Quản lý bình luận
          </Link>

          {/* Label management: admin, admin_posts */}
          {['admin', 'admin_posts'].includes(role) && (
            <Link
              href="/admin/labels"
              className={`admin-nav-link ${pathname.startsWith('/admin/labels') ? 'active' : ''}`}
            >
              <FiTag /> Nhãn & Chủ đề
            </Link>
          )}

          {['admin', 'admin_posts'].includes(role) && (
            <Link
              href="/admin/lda"
              className={`admin-nav-link ${pathname.startsWith('/admin/lda') ? 'active' : ''}`}
            >
              <FiCpu /> Tự động gán nhãn (LDA)
            </Link>
          )}
        </div>

        {/* User & Role management */}
        {['admin', 'admin_support'].includes(role) && (
          <div className="admin-nav-section">
            <div className="admin-nav-title">Người dùng & Phân quyền</div>
            <Link
              href="/admin/users"
              className={`admin-nav-link ${pathname.startsWith('/admin/users') ? 'active' : ''}`}
            >
              <FiUsers /> Quản lý người dùng
            </Link>
            {role === 'admin' && (
              <Link
                href="/admin/roles"
                className={`admin-nav-link ${pathname.startsWith('/admin/roles') ? 'active' : ''}`}
              >
                <FiKey /> Ma trận phân quyền
              </Link>
            )}
          </div>
        )}

        <div className="admin-nav-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <Link href="/" className="admin-nav-link">
            <FiExternalLink /> Xem trang chủ website
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-nav-link"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
          >
            <FiLogOut /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="admin-content">
        {/* Top Navbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          padding: '12px 20px',
          background: 'var(--glass-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            <FiShield style={{ color: 'var(--accent-primary)' }} />
            <span>Khu vực quản trị hệ thống</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" className="btn btn-secondary btn-sm">
              <FiExternalLink /> Xem trang web
            </Link>
            <Link href={`/profile/${user._id}`} className="btn btn-primary btn-sm">
              Trang cá nhân
            </Link>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
