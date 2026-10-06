'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { postAPI } from '@/lib/api';
import { 
  FiSearch, 
  FiEdit, 
  FiUser, 
  FiSettings, 
  FiShield, 
  FiLogOut, 
  FiCompass, 
  FiHome,
  FiBookOpen,
  FiMenu,
  FiX,
  FiTag,
  FiFileText,
  FiArrowRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ labels: [], posts: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close dropdown & suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions({ labels: [], posts: [] });
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await postAPI.getSuggestions(q);
        if (data.success) {
          setSuggestions(data.data);
          const hasResults = (data.data.labels?.length > 0) || (data.data.posts?.length > 0);
          setShowSuggestions(hasResults);
        }
      } catch (err) {
        // Silently fail suggestions
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close menus on path change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setShowSuggestions(false);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Đăng xuất thành công');
    router.push('/');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin Tổng';
      case 'admin_posts': return 'Admin Bài Viết';
      case 'admin_support': return 'Admin Hỗ Trợ';
      default: return 'Thành viên';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <FiBookOpen style={{ fontSize: 26 }} />
          <span>VănBản<span style={{ color: '#a78bfa' }}>Blog</span></span>
        </Link>

        {/* Search bar with text suggestions */}
        <div ref={searchContainerRef} style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <form onSubmit={handleSearch} className="search-bar desktop-search" style={{ width: '100%' }}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if ((suggestions.labels?.length > 0) || (suggestions.posts?.length > 0)) {
                  setShowSuggestions(true);
                }
              }}
            />
          </form>

          {/* Autocomplete Suggestions Dropdown (Text Only) */}
          {showSuggestions && (
            <div className="search-suggestions-dropdown">
              {/* Matching labels */}
              {suggestions.labels?.length > 0 && (
                <div className="suggestion-section">
                  <div className="suggestion-header">Chủ đề & Nhãn</div>
                  {suggestions.labels.map((lbl) => (
                    <button
                      key={lbl._id || lbl.slug}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearchQuery(lbl.name);
                        router.push(`/?label=${lbl._id}`);
                      }}
                    >
                      <FiTag className="suggestion-icon" />
                      <span className="suggestion-text">
                        <strong>{lbl.name}</strong>
                      </span>
                      <FiArrowRight style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Matching post titles */}
              {suggestions.posts?.length > 0 && (
                <div className="suggestion-section">
                  <div className="suggestion-header">Bài viết gợi ý</div>
                  {suggestions.posts.map((post) => (
                    <button
                      key={post._id || post.slug}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        router.push(`/posts/${post.slug}`);
                      }}
                    >
                      <FiFileText className="suggestion-icon" />
                      <span className="suggestion-text">{post.title}</span>
                      <FiArrowRight style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Search full text footer */}
              {searchQuery.trim() && (
                <button
                  type="button"
                  className="suggestion-item suggestion-footer"
                  onClick={(e) => handleSearch(e)}
                >
                  <FiSearch className="suggestion-icon" />
                  <span className="suggestion-text">
                    Tìm kiếm tất cả kết quả cho <em>"{searchQuery}"</em>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="navbar-nav">
          <Link 
            href="/" 
            className={`navbar-link ${pathname === '/' ? 'active' : ''}`}
          >
            <FiHome style={{ marginRight: 4 }} /> Trang chủ
          </Link>
          <Link 
            href="/posts/create" 
            className={`navbar-link ${pathname === '/posts/create' ? 'active' : ''}`}
          >
            <FiEdit style={{ marginRight: 4 }} /> Viết bài
          </Link>
          {isAdmin && (
            <Link 
              href="/admin" 
              className={`navbar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
              style={{ color: '#a78bfa', fontWeight: 600 }}
            >
              <FiShield style={{ marginRight: 4 }} /> Quản trị
            </Link>
          )}
        </nav>

        {/* User actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button 
                type="button" 
                className="user-avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
              >
                <img 
                  src={user.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'} 
                  alt={user.fullName} 
                />
              </button>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <h4>{user.fullName}</h4>
                    <p>{user.email}</p>
                    <span 
                      className="badge badge-primary" 
                      style={{ marginTop: 8, fontSize: 11 }}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </div>

                  <Link 
                    href={`/profile/${user._id}`} 
                    className="dropdown-item"
                  >
                    <FiUser /> Trang cá nhân & Tường
                  </Link>
                  <Link 
                    href="/profile/settings" 
                    className="dropdown-item"
                  >
                    <FiSettings /> Cài đặt & Đổi mật khẩu
                  </Link>

                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      className="dropdown-item"
                      style={{ color: '#818cf8' }}
                    >
                      <FiShield /> Bảng quản trị
                    </Link>
                  )}

                  <div className="dropdown-divider" />
                  <button 
                    type="button" 
                    onClick={handleLogout} 
                    className="dropdown-item danger"
                  >
                    <FiLogOut /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/login" className="btn btn-secondary btn-sm">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button 
            type="button"
            className="btn btn-icon btn-secondary mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{ 
          background: 'var(--bg-card)', 
          borderTop: '1px solid var(--border-color)',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 8 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 38 }}
            />
          </form>
          <Link href="/" className="navbar-link">
            <FiHome style={{ marginRight: 8 }} /> Trang chủ
          </Link>
          <Link href="/posts/create" className="navbar-link">
            <FiEdit style={{ marginRight: 8 }} /> Viết bài
          </Link>
          {isAdmin && (
            <Link href="/admin" className="navbar-link" style={{ color: '#a78bfa' }}>
              <FiShield style={{ marginRight: 8 }} /> Quản trị
            </Link>
          )}
          {user ? (
            <>
              <Link href={`/profile/${user._id}`} className="navbar-link">
                <FiUser style={{ marginRight: 8 }} /> Trang cá nhân
              </Link>
              <Link href="/profile/settings" className="navbar-link">
                <FiSettings style={{ marginRight: 8 }} /> Cài đặt tài khoản
              </Link>
              <button 
                onClick={handleLogout} 
                className="btn btn-danger btn-sm"
                style={{ marginTop: 8 }}
              >
                <FiLogOut style={{ marginRight: 6 }} /> Đăng xuất
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link href="/login" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                Đăng nhập
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
