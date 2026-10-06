'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Vui lòng đăng nhập để tiếp tục');
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        toast.error('Bạn không có quyền truy cập trang này');
        router.push('/');
      }
    }
  }, [user, loading, router, pathname, allowedRoles]);

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--error)' }}>
          Truy cập bị từ chối
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Tài khoản của bạn không có quyền truy cập vào khu vực này.
        </p>
        <button 
          onClick={() => router.push('/')} 
          className="btn btn-primary"
        >
          Trở về Trang chủ
        </button>
      </div>
    );
  }

  return children;
}
