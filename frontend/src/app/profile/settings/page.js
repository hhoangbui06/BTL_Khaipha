'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { 
  FiUser, 
  FiLock, 
  FiCamera, 
  FiArrowLeft, 
  FiSave,
  FiPhone,
  FiMapPin,
  FiMail
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuth();

  // Profile form
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar form
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  // Handle avatar select & upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh đại diện không được vượt quá 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    // Upload immediately
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await authAPI.updateAvatar(formData);
      if (data.success) {
        toast.success('Đã cập nhật ảnh đại diện');
        updateUser(data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải ảnh đại diện');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle profile submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        address: address.trim()
      });
      if (data.success) {
        toast.success('Cập nhật thông tin thành công');
        updateUser(data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle change password submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await authAPI.changePassword({
        currentPassword,
        newPassword
      });
      if (data.success) {
        toast.success('Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        <main style={{ flex: 1, padding: '40px 0 60px' }}>
          <div className="page-container" style={{ maxWidth: 800 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <Link 
                href={user ? `/profile/${user._id}` : '/'}
                className="btn btn-ghost"
                style={{ fontSize: 14 }}
              >
                <FiArrowLeft /> Về trang cá nhân
              </Link>
              <h2 className="page-title" style={{ fontSize: 26, margin: 0 }}>
                Cài đặt tài khoản
              </h2>
            </div>

            {/* Avatar Section */}
            <div className="card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={avatarPreview || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                  alt={user?.fullName}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                    border: '3px solid var(--accent-primary)'
                  }}
                />
                <label style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--accent-primary)',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <FiCamera />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  {user?.fullName}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                  {user?.email}
                </p>
                <span className="badge badge-primary">
                  {user?.role === 'admin' ? 'Admin Tổng' : user?.role === 'admin_posts' ? 'Admin Bài viết' : user?.role === 'admin_support' ? 'Admin CSKH' : 'Thành viên'}
                </span>
                {uploadingAvatar && (
                  <span style={{ fontSize: 12, color: 'var(--accent-primary)', marginLeft: 12 }}>
                    Đang tải ảnh lên...
                  </span>
                )}
              </div>
            </div>

            {/* Personal Info Form */}
            <div className="card" style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiUser /> Thông tin cá nhân
              </h3>

              <form onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tiểu sử (Bio)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Giới thiệu đôi nét về bản thân, chuyên môn hoặc sở thích..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <div style={{ position: 'relative' }}>
                      <FiPhone style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: 40 }}
                        placeholder="0912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <div style={{ position: 'relative' }}>
                      <FiMapPin style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: 40 }}
                        placeholder="Hà Nội, Việt Nam"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                  >
                    <FiSave /> {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="card">
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiLock /> Đổi mật khẩu
              </h3>

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới (ít nhất 6 ký tự)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingPassword}
                  >
                    <FiLock /> {savingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
