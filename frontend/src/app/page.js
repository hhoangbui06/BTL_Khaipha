'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import { postAPI, labelAPI } from '@/lib/api';
import { 
  FiSearch, 
  FiFilter, 
  FiTrendingUp, 
  FiEdit3, 
  FiLayers, 
  FiXCircle, 
  FiCompass,
  FiRefreshCw
} from 'react-icons/fi';
import Link from 'next/link';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filter states from URL or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedLabel, setSelectedLabel] = useState(searchParams.get('label') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [randomSeed, setRandomSeed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state if URL search query changes
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) setSearch(urlSearch);
  }, [searchParams]);

  // Fetch labels
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const { data } = await labelAPI.getAll();
        if (data.success) {
          setLabels(data.data);
        }
      } catch (error) {
        console.error('Error fetching labels:', error);
      }
    };
    fetchLabels();
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        sort,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedLabel) params.label = selectedLabel;
      if (sort === 'random') params._t = Date.now();

      const { data } = await postAPI.getAll(params);
      if (data.success) {
        setPosts(data.data.posts);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, sort, search, selectedLabel, randomSeed]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRandomRefresh = () => {
    setIsRefreshing(true);
    setRandomSeed(prev => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleLabelClick = (labelId) => {
    setSelectedLabel(prev => prev === labelId ? '' : labelId);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedLabel('');
    setSort('newest');
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={{
          position: 'relative',
          padding: '64px 24px 48px',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <span 
              className="badge badge-primary"
              style={{ padding: '6px 16px', fontSize: 13, marginBottom: 20 }}
            >
              🚀 Nền tảng Viết Blog & Tương tác Cộng đồng
            </span>

            <h1 className="page-title" style={{ fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.2, margin: '16px 0' }}>
              Chia sẻ Tri thức, Kết nối Đam mê & Khám phá Góc nhìn Mới
            </h1>

            <p className="page-subtitle" style={{ fontSize: 17, maxWidth: 640, margin: '0 auto 32px' }}>
              Nền tảng blog hiện đại hỗ trợ đăng bài, tương tác like, bình luận đa cấp, chia sẻ tường cá nhân và phân quyền đa cấp.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/posts/create" className="btn btn-primary btn-lg">
                <FiEdit3 style={{ fontSize: 18 }} /> Bắt đầu viết bài
              </Link>
              <a href="#feed" className="btn btn-secondary btn-lg">
                <FiCompass style={{ fontSize: 18 }} /> Khám phá bài viết
              </a>
            </div>
          </div>
        </section>

        {/* Feed & Filter Section */}
        <section id="feed" className="page-container" style={{ paddingTop: 0 }}>
          {/* Filters Bar */}
          <div className="filters-bar">
            {/* Search Input */}
            <form 
              onSubmit={handleSearchSubmit} 
              style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}
            >
              <div style={{ position: 'relative', width: '100%' }}>
                <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo từ khóa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Tìm
              </button>
            </form>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FiTrendingUp style={{ color: 'var(--accent-primary)' }} />
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="filter-select"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="most_likes">Nhiều lượt thích nhất</option>
                <option value="most_comments">Nhiều bình luận nhất</option>
                <option value="most_shares">Nhiều lượt chia sẻ nhất</option>
                <option value="random">Ngẫu nhiên</option>
              </select>

              {sort === 'random' && (
                <button
                  type="button"
                  onClick={handleRandomRefresh}
                  disabled={loading || isRefreshing}
                  className="random-refresh-btn"
                  title="Nhấp để xáo trộn / chọn lại ngẫu nhiên các bài viết"
                >
                  <FiRefreshCw className={isRefreshing ? 'spin-animation' : ''} />
                  <span>Đổi bài ngẫu nhiên</span>
                </button>
              )}
            </div>

            {/* Clear Filters Button if any active */}
            {(search || selectedLabel || sort !== 'newest') && (
              <button 
                type="button" 
                onClick={handleClearFilters}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error)' }}
              >
                <FiXCircle /> Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Label Pills */}
          {labels.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 16,
              marginBottom: 24,
              scrollbarWidth: 'none'
            }}>
              <button
                type="button"
                onClick={() => { setSelectedLabel(''); setPage(1); }}
                className="btn btn-sm"
                style={{
                  background: !selectedLabel ? 'var(--accent-gradient)' : 'var(--bg-card)',
                  color: !selectedLabel ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                Tất cả ({pagination.total || 0})
              </button>

              {labels.map((lbl) => {
                const isSelected = selectedLabel === lbl._id;
                return (
                  <button
                    key={lbl._id}
                    type="button"
                    onClick={() => handleLabelClick(lbl._id)}
                    className="btn btn-sm"
                    style={{
                      background: isSelected ? lbl.color : 'var(--bg-card)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: isSelected ? lbl.color : 'var(--border-color)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    #{lbl.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Posts Grid */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="posts-grid">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
              />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">Không tìm thấy bài viết nào</h3>
              <p className="empty-state-text">
                Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để hiển thị toàn bộ bài viết.
              </p>
              {(search || selectedLabel) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 16 }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
