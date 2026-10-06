'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiShield, 
  FiArrowLeft, 
  FiAlertTriangle,
  FiUserX,
  FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

function AdminLoginContent() {
  const router = useRouter();
  const { user, adminLogin } = useAuth();

  useEffect(() => {
    if (user && ['admin', 'admin_posts', 'admin_support'].includes(user.role)) {
      router.replace('/admin');
    }
  }, [user, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Vui lòng kiểm tra tài khoản hoặc mật khẩu');
      toast.error('Vui lòng kiểm tra tài khoản hoặc mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const data = await adminLogin(email.trim(), password);
      if (data.success) {
        toast.success('Đăng nhập trang quản trị thành công!');
        router.push('/admin');
      }
    } catch (error) {
      // Always show "Vui lòng kiểm tra tài khoản hoặc mật khẩu" when user has role 'user' or invalid credentials
      const msg = error.response?.data?.message || 'Vui lòng kiểm tra tài khoản hoặc mật khẩu';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage('');
  };

  return (
    <div className="auth-page" style={{
      background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08) 0%, var(--bg-primary) 70%)'
    }}>
      <div className="auth-card" style={{ maxWidth: 460 }}>
        {/* Back Link */}
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            color: 'var(--text-muted)', 
            fontSize: 13, 
            marginBottom: 24 
          }}
        >
          <FiArrowLeft /> Về trang chủ người dùng (Client)
        </Link>

        {/* Security Badge Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: 'var(--accent-primary)',
            marginBottom: 16,
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.25)'
          }}>
            <FiShield />
          </div>
          <h2 className="auth-title" style={{ fontSize: 26 }}>
            Cổng Quản Trị Hệ Thống
          </h2>
          <p className="auth-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
            Khu vực bảo mật dành riêng cho Quản trị viên (Admin)
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#f87171',
            fontSize: 14,
            fontWeight: 500
          }}>
            <FiAlertTriangle style={{ flexShrink: 0, fontSize: 18 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email quản trị</label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 42 }}
                placeholder="admin@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu quản trị</label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
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
            {loading ? 'Đang xác thực bảo mật...' : 'Đăng nhập Quản trị'}
          </button>
        </form>

        {/* Testing helper box */}
        <div style={{
          marginTop: 28,
          padding: 16,
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 8 }}>
            🧪 Bấm để kiểm tra phân quyền đăng nhập:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 8px' }}
            >
              👑 Admin Tổng
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin_posts@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 8px' }}
            >
              ✍️ Admin Bài Viết
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin_support@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 8px' }}
            >
              🎧 Admin CSKH
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user@gmail.com', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 8px', color: 'var(--error)' }}
              title="Bấm để thử nghiệm thành viên thường vào admin"
            >
              👤 Thử Thành viên (Sẽ báo lỗi)
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            * Tài khoản Thành viên thông thường khi bấm "Đăng nhập Quản trị" sẽ bị chặn lại ngay lập tức và thông báo <strong>"Vui lòng kiểm tra tài khoản hoặc mật khẩu"</strong>, không cho phép truy cập.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
