'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { FiMail, FiBookOpen, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Vui lòng nhập địa chỉ email');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authAPI.forgotPassword(email.trim());
      if (data.success) {
        setSent(true);
        toast.success('Đã gửi email khôi phục mật khẩu!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link 
          href="/login" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            color: 'var(--text-muted)', 
            fontSize: 13, 
            marginBottom: 20 
          }}
        >
          <FiArrowLeft /> Quay lại Đăng nhập
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16
            }}>
              <FiCheckCircle />
            </div>
            <h2 className="auth-title">Kiểm tra Email của bạn</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '12px 0 24px', lineHeight: 1.6 }}>
              Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <strong>{email}</strong>. 
              Vui lòng kiểm tra hộp thư (kể cả mục Spam) và làm theo hướng dẫn.
            </p>
            <Link href="/login" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
              Trở về Đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FiBookOpen style={{ fontSize: 28, color: 'var(--accent-primary)' }} />
              </div>
              <h2 className="auth-title">Quên mật khẩu?</h2>
              <p className="auth-subtitle">Nhập email đăng ký của bạn để nhận liên kết khôi phục</p>
            </div>

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

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? 'Đang gửi yêu cầu...' : 'Gửi liên kết khôi phục'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
