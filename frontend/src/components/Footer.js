import Link from 'next/link';
import { FiBookOpen, FiHeart, FiGithub, FiMail } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
      padding: '48px 24px 24px',
      marginTop: 'auto',
      position: 'relative',
      zIndex: 1
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 32,
        marginBottom: 36
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <FiBookOpen style={{ fontSize: 24, color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 20, fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Blog
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Nền tảng chia sẻ kiến thức, kinh nghiệm và những câu chuyện công nghệ truyền cảm hứng.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            Khám phá
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <Link href="/" style={{ color: 'var(--text-secondary)' }}>Trang chủ</Link>
            <Link href="/posts/create" style={{ color: 'var(--text-secondary)' }}>Đăng bài viết mới</Link>
            <Link href="/login" style={{ color: 'var(--text-secondary)' }}>Đăng nhập hệ thống</Link>
            <Link href="/register" style={{ color: 'var(--text-secondary)' }}>Đăng ký tài khoản</Link>
          </div>
        </div>

        {/* Roles & Permissions */}
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            Phân quyền hệ thống
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            <div>👑 <strong style={{ color: 'var(--text-secondary)' }}>Admin Tổng:</strong> Toàn quyền quản trị</div>
            <div>✍️ <strong style={{ color: 'var(--text-secondary)' }}>Admin Bài viết:</strong> Duyệt & biên tập nội dung</div>
            <div>🎧 <strong style={{ color: 'var(--text-secondary)' }}>Admin CSKH:</strong> Hỗ trợ & phản hồi người dùng</div>
            <div>👤 <strong style={{ color: 'var(--text-secondary)' }}>Thành viên:</strong> Đăng bài, tương tác, chia sẻ wall</div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        paddingTop: 24,
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 13,
        color: 'var(--text-muted)'
      }}>
        <div>
          © {new Date().getFullYear()} Blog. Xây dựng với MongoDB, Express, Next.js & Node.js.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Thiết kế với <FiHeart style={{ color: 'var(--like-color)', fill: 'var(--like-color)' }} /> bởi Deepmind & Antigravity
        </div>
      </div>
    </footer>
  );
}
