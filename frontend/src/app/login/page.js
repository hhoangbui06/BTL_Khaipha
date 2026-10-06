'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen, FiArrowLeft, FiUserCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (redirectUrl.startsWith('/admin')) {
      router.replace('/admin/login');
    }
  }, [redirectUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.success) {
        if (redirectUrl.startsWith('/admin') && !['admin', 'admin_posts', 'admin_support'].includes(data.data.user.role)) {
          toast.error('Vui lòng kiểm tra tài khoản hoặc mật khẩu');
          router.push('/admin/login');
          return;
        }
        toast.success('Đăng nhập thành công!');
        router.push(redirectUrl);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Back Link */}
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            color: 'var(--text-muted)', 
            fontSize: 13, 
            marginBottom: 20 
          }}
        >
          <FiArrowLeft /> Về trang chủ
        </Link>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FiBookOpen style={{ fontSize: 28, color: 'var(--accent-primary)' }} />
          </div>
          <h2 className="auth-title">Chào mừng trở lại</h2>
          <p className="auth-subtitle">Đăng nhập để đăng bài và tương tác cùng cộng đồng</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Địa chỉ Email</label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 42 }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Mật khẩu</label>
              <Link 
                href="/forgot-password" 
                style={{ fontSize: 13, color: 'var(--accent-primary)' }}
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Quick Credentials Helper for Evaluation */}
        <div style={{
          marginTop: 28,
          padding: 16,
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 10 }}>
            <FiUserCheck /> Tài khoản mẫu (Bấm để điền nhanh):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              👑 Admin Tổng
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin_posts@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              ✍️ Admin Bài Viết
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin_support@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              🎧 Admin CSKH
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('user@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              👤 Thành viên
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link href="/register">Đăng ký ngay</Link>
        </div>
        <div className="auth-footer" style={{ marginTop: 8 }}>
          Bạn là Quản trị viên?{' '}
          <Link href="/admin/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Đăng nhập Quản trị (Admin)
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
