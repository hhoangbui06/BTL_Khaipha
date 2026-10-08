'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { authAPI, postAPI } from '@/lib/api';
import { 
  FiUser, 
  FiEdit, 
  FiSettings, 
  FiCalendar, 
  FiBookOpen, 
  FiShare2, 
  FiGrid,
  FiShield
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function UserProfilePage() {
  const [askConfirm, confirmElement] = useConfirm();
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Wall feed items
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'own' | 'shared'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const isOwnProfile = currentUser && currentUser._id === id;

  // Fetch profile user info
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const { data } = await authAPI.getUserProfile(id);
        if (data.success) {
          setProfileUser(data.data);
        }
      } catch (error) {
        console.error('Fetch profile error:', error);
        toast.error('Không tìm thấy người dùng');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // Fetch user posts and shares (wall)
  const fetchWall = useCallback(async () => {
    setItemsLoading(true);
    try {
      const { data } = await postAPI.getUserPosts(id, { page, limit: 10 });
      if (data.success) {
        setItems(data.data.items);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Fetch wall error:', error);
    } finally {
      setItemsLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchWall();
  }, [fetchWall]);

  // Filter items by active tab
  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'own') return item.type === 'own';
    if (activeTab === 'shared') return item.type === 'shared';
    return true;
  });

  // Handle unshare
  const handleUnshare = async (postId) => {
    if (!(await askConfirm({
      title: 'Gỡ bài chia sẻ?',
      message: 'Bài viết sẽ được gỡ khỏi trang cá nhân của bạn. Bài viết gốc không bị ảnh hưởng.',
      confirmText: 'Gỡ',
      danger: true
    }))) return;

    try {
      const { data } = await postAPI.unshare(postId);
      if (data.success) {
        toast.success('Đã gỡ bài viết khỏi trang cá nhân');
        fetchWall();
      }
    } catch (error) {
      toast.error('Lỗi khi gỡ bài viết');
    }
  };

  // Handle delete own post
  // PostCard đã hiển thị hộp thoại xác nhận trước khi gọi hàm này
  const handleDeletePost = async (postId) => {
    const { data } = await postAPI.delete(postId);
    if (data.success) {
      toast.success('Đã xóa bài viết');
      fetchWall();
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-primary">👑 Admin Tổng</span>;
      case 'admin_posts':
        return <span className="badge badge-info">✍️ Admin Quản lý bài viết</span>;
      case 'admin_support':
        return <span className="badge badge-warning">🎧 Chăm sóc khách hàng</span>;
      default:
        return <span className="badge badge-success">👤 Thành viên</span>;
    }
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMMM yyyy', { locale: vi });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '32px 0 60px' }}>
        <div className="page-container" style={{ maxWidth: 1040 }}>
          {/* Profile Header */}
          {profileLoading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : profileUser ? (
            <div className="profile-header">
              <img
                src={profileUser.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                alt={profileUser.fullName}
                className="profile-avatar"
              />

              <h1 className="profile-name">
                {profileUser.fullName}
              </h1>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                {getRoleBadge(profileUser.role)}
              </div>

              {profileUser.bio && (
                <p className="profile-bio">
                  {profileUser.bio}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                <FiCalendar /> Tham gia từ {formatJoinDate(profileUser.createdAt)}
              </div>

              {/* Stats */}
              <div className="profile-stats">
                <div className="profile-stat">
                  <div className="profile-stat-value">{profileUser.postCount || 0}</div>
                  <div className="profile-stat-label">Bài tự viết</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">{profileUser.shareCount || 0}</div>
                  <div className="profile-stat-label">Bài đã chia sẻ</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">
                    {(profileUser.postCount || 0) + (profileUser.shareCount || 0)}
                  </div>
                  <div className="profile-stat-label">Tổng bài trên tường</div>
                </div>
              </div>

              {/* Edit Profile Button if own profile */}
              {isOwnProfile && (
                <div style={{ marginTop: 24 }}>
                  <Link href="/profile/settings" className="btn btn-secondary btn-sm">
                    <FiSettings /> Chỉnh sửa thông tin & Mật khẩu
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Người dùng không tồn tại</h3>
            </div>
          )}

          {/* Wall Tabs Navigation */}
          <div style={{
            display: 'flex',
            gap: 12,
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 28,
            paddingBottom: 4
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="btn btn-ghost"
              style={{
                color: activeTab === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'all' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderRadius: 0,
                fontWeight: 600
              }}
            >
              <FiGrid /> Tường nhà (Tất cả)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('own')}
              className="btn btn-ghost"
              style={{
                color: activeTab === 'own' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'own' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderRadius: 0,
                fontWeight: 600
              }}
            >
              <FiBookOpen /> Bài viết đã đăng ({items.filter(i => i.type === 'own').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className="btn btn-ghost"
              style={{
                color: activeTab === 'shared' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'shared' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderRadius: 0,
                fontWeight: 600
              }}
            >
              <FiShare2 /> Bài đã chia sẻ ({items.filter(i => i.type === 'shared').length})
            </button>
          </div>

          {/* Wall Items Feed */}
          {itemsLoading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {filteredItems.map((item) => (
                <div key={item.post?._id + (item.type === 'shared' ? '-shared' : '')}>
                  <PostCard
                    post={item.post}
                    isShared={item.type === 'shared'}
                    shareNote={item.note}
                    sharedAt={item.sharedAt}
                    onUnshare={isOwnProfile && item.type === 'shared' ? handleUnshare : null}
                    onDelete={item.type === 'own' ? handleDeletePost : null}
                  />
                </div>
              ))}

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3 className="empty-state-title">Chưa có bài viết nào</h3>
              <p className="empty-state-text">
                {isOwnProfile 
                  ? 'Bắt đầu viết bài đầu tiên hoặc chia sẻ bài viết hay từ trang chủ về tường của bạn!'
                  : 'Người dùng này chưa có hoạt động nào trong mục này.'}
              </p>
              {isOwnProfile && (
                <Link href="/posts/create" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                  Viết bài ngay
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {confirmElement}
    </div>
  );
}
