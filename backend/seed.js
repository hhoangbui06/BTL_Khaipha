const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix for Windows DNS querySrv EREFUSED with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const User = require('./models/user-model');
const Post = require('./models/post-model');
const Label = require('./models/label-model');
const Comment = require('./models/comment-model');
const Share = require('./models/share-model');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB;
    const fallbackUri = process.env.MONGODB_SUPPORT 
      ? (process.env.MONGODB_SUPPORT.startsWith('mongodb://') ? process.env.MONGODB_SUPPORT : `mongodb://${process.env.MONGODB_SUPPORT}`)
      : 'mongodb://127.0.0.1:27017/vanban-project';

    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
      console.log('✅ Connected to MongoDB Atlas!');
    } catch (atlasErr) {
      console.warn(`⚠️ MongoDB Atlas error: ${atlasErr.message}`);
      console.log(`Connecting to fallback MongoDB (${fallbackUri})...`);
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ Connected to MongoDB Fallback!');
    }

    // Check or create default labels
    const defaultLabels = [
      { name: 'Công nghệ', description: 'Tin tức và bài viết về xu hướng công nghệ mới', color: '#6366f1' },
      { name: 'Lập trình', description: 'Kỹ thuật lập trình web, backend, frontend và kiến trúc hệ thống', color: '#10b981' },
      { name: 'Trí tuệ nhân tạo', description: 'Khám phá AI, Machine Learning, Deep Learning và LLMs', color: '#8b5cf6' },
      { name: 'Đời sống', description: 'Góc nhìn, kinh nghiệm và chia sẻ cuộc sống thường nhật', color: '#f59e0b' },
      { name: 'Thiết kế', description: 'UI/UX Design, Typography và xu hướng thiết kế giao diện', color: '#ec4899' },
    ];

    const labelDocs = [];
    for (const l of defaultLabels) {
      let label = await Label.findOne({ name: l.name });
      if (!label) {
        label = await Label.create(l);
        console.log(`Created label: ${l.name}`);
      }
      labelDocs.push(label);
    }

    // Default accounts
    const defaultUsers = [
      {
        fullName: 'Admin Tổng',
        email: 'admin@gmail.com',
        password: 'password123',
        role: 'admin',
        bio: 'Quản trị viên cấp cao của hệ thống Blog Platform',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
        status: 'active',
        emailVerified: true
      },
      {
        fullName: 'Admin Bài Viết',
        email: 'admin_posts@gmail.com',
        password: 'password123',
        role: 'admin_posts',
        bio: 'Biên tập viên & Quản lý nội dung bài viết',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
        status: 'active',
        emailVerified: true
      },
      {
        fullName: 'Admin Hỗ Trợ CSKH',
        email: 'admin_support@gmail.com',
        password: 'password123',
        role: 'admin_support',
        bio: 'Chăm sóc và hỗ trợ người dùng hệ thống',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=faces',
        status: 'active',
        emailVerified: true
      },
      {
        fullName: 'Hoàng Bùi',
        email: 'user@gmail.com',
        password: 'password123',
        role: 'user',
        bio: 'Fullstack Developer đam mê công nghệ và chia sẻ kiến thức mới.',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop&crop=faces',
        status: 'active',
        emailVerified: true
      }
    ];

    const userDocs = [];
    for (const u of defaultUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create(u);
        console.log(`Created user: ${u.email} (${u.role})`);
      }
      userDocs.push(user);
    }

    // Check if posts exist, if not create sample posts
    const postCount = await Post.countDocuments({ deleted: false });
    if (postCount === 0) {
      const samplePosts = [
        {
          title: 'Khám phá kiến trúc Next.js App Router và Server Actions năm 2024',
          content: `<h2>Next.js App Router là gì?</h2>
<p>Next.js 14 tiếp tục nâng cao trải nghiệm phát triển web với App Router dựa trên React Server Components (RSC). Điều này giúp tối ưu hóa hiệu năng tải trang ban đầu và giảm thiểu kích thước bundle gửi đến client.</p>
<h3>Các ưu điểm nổi bật:</h3>
<ul>
  <li><strong>Server Components mặc định:</strong> Giúp tải dữ liệu nhanh chóng ngay tại server mà không cần thêm API trung gian.</li>
  <li><strong>Streaming & Suspense:</strong> Hiển thị giao diện tức thì trong khi nội dung nặng được truyền tải tuần tự.</li>
  <li><strong>Server Actions:</strong> Xử lý form mutation trực tiếp không cần viết endpoint riêng biệt.</li>
</ul>
<blockquote>Sự kết hợp giữa Next.js và MongoDB tạo ra một nền tảng full-stack mạnh mẽ, linh hoạt và tốc độ vượt trội cho mọi ứng dụng hiện đại.</blockquote>
<p>Hãy trải nghiệm việc xây dựng một blog chuẩn MERN kết hợp Next.js để thấy sự khác biệt về năng suất làm việc nhé!</p>`,
          excerpt: 'Tìm hiểu sâu về cơ chế hoạt động của Next.js App Router, React Server Components và cách tối ưu hóa hiệu năng ứng dụng web.',
          thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=450&fit=crop',
          author: userDocs[0]._id,
          labels: [labelDocs[0]._id, labelDocs[1]._id],
          status: 'published',
          featured: true,
          viewCount: 142,
          likes: [userDocs[1]._id, userDocs[2]._id, userDocs[3]._id]
        },
        {
          title: '10 Xu hướng Trí tuệ nhân tạo (AI) sẽ thay đổi thế giới lập trình',
          content: `<h2>Kỷ nguyên lập trình được hỗ trợ bởi AI</h2>
<p>Trí tuệ nhân tạo không còn là viễn cảnh xa xôi mà đã trở thành trợ thủ đắc lực hàng ngày của mỗi developer. Từ việc tự động sinh mã, phân tích bug, đến kiểm thử phần mềm.</p>
<h3>1. LLMs chuyên biệt cho Code</h3>
<p>Các mô hình như Claude, Gemini hay GPT-4o đang hiểu ngữ cảnh code sâu sắc hơn, có khả năng refactor các module phức tạp chỉ trong vài giây.</p>
<h3>2. Tự động hóa kiểm thử và bảo mật</h3>
<p>AI có thể quét qua hàng triệu dòng mã để phát hiện lỗ hổng SQL injection, XSS hay memory leak trước khi code được đẩy lên môi trường production.</p>
<p>Điều quan trọng nhất là lập trình viên cần học cách tư duy kiến trúc và làm chủ công cụ AI thay vì lo sợ bị thay thế.</p>`,
          excerpt: 'AI đang tái định hình cách chúng ta viết code, kiểm thử phần mềm và xây dựng sản phẩm công nghệ.',
          thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop',
          author: userDocs[1]._id,
          labels: [labelDocs[2]._id, labelDocs[0]._id],
          status: 'published',
          featured: true,
          viewCount: 230,
          likes: [userDocs[0]._id, userDocs[3]._id]
        },
        {
          title: 'Nghệ thuật thiết kế Glassmorphism trong Modern UI Design',
          content: `<h2>Tại sao Glassmorphism lại được ưa chuộng?</h2>
<p>Glassmorphism đem lại vẻ đẹp hiện đại, đa chiều với hiệu ứng mờ ảo (frosted-glass) sang trọng. Nó tạo cảm giác các khối giao diện nổi nhẹ trên nền background huyền ảo.</p>
<h3>3 nguyên tắc cốt lõi:</h3>
<ol>
  <li><strong>Độ trong suốt đa tầng (Transparency):</strong> Sử dụng background với kênh alpha (rgba) vừa phải.</li>
  <li><strong>Backdrop-filter blur:</strong> Làm mờ các chi tiết phía sau để tăng độ tương phản cho văn bản.</li>
  <li><strong>Đường viền tinh tế (Subtle Border):</strong> Tạo viền 1px bán trong suốt kèm đổ bóng mềm mại (glow effect).</li>
</ol>
<p>Khi kết hợp với Dark Mode và các tông màu Gradient tím - xanh Neon, giao diện sẽ trở nên vô cùng cuốn hút!</p>`,
          excerpt: 'Hướng dẫn ứng dụng phong cách Glassmorphism vào thiết kế web hiện đại để tạo ấn tượng mạnh mẽ cho người dùng.',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=450&fit=crop',
          author: userDocs[3]._id,
          labels: [labelDocs[4]._id],
          status: 'published',
          featured: false,
          viewCount: 95,
          likes: [userDocs[0]._id]
        }
      ];

      for (const p of samplePosts) {
        const post = await Post.create(p);
        console.log(`Created sample post: ${p.title}`);

        // Add a sample comment
        await Comment.create({
          content: 'Bài viết rất hữu ích và trình bày đẹp mắt! Cảm ơn tác giả nhiều.',
          post: post._id,
          author: userDocs[2]._id
        });
      }
    }

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
