'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Mã xác thực không hợp lệ hoặc bị thiếu.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token);
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Xác thực tài khoản thành công!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực thất bại');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Liên kết xác thực đã hết hạn hoặc không tồn tại.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <div>
            <FiLoader style={{ fontSize: 44, color: 'var(--accent-primary)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <h2 className="auth-title">Đang xác thực tài khoản</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Vui lòng đợi giây lát trong khi chúng tôi kiểm tra liên kết của bạn...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
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
            <h2 className="auth-title" style={{ color: 'var(--success)' }}>
              Xác thực thành công!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '12px 0 24px' }}>
              {message} Email của bạn đã được kích hoạt thành công.
            </p>
            <Link href="/" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Đến Trang chủ
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{
              width: 56,
              height: 56,
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--error)',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16
            }}>
              <FiAlertCircle />
            </div>
            <h2 className="auth-title" style={{ color: 'var(--error)' }}>
              Xác thực thất bại
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '12px 0 24px' }}>
              {message}
            </p>
            <Link href="/login" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
              Quay lại Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
