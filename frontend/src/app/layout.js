import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import CustomToaster from '@/components/CustomToaster';

export const metadata = {
  title: 'VănBảnBlog - Nền tảng viết blog & chia sẻ tri thức',
  description: 'Trang web chia sẻ bài viết, kiến thức công nghệ, lập trình và cuộc sống với hệ thống tương tác và phân quyền đa tầng.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <CustomToaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
