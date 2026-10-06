'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import QuillEditor from '@/components/QuillEditor';
import { postAPI, labelAPI } from '@/lib/api';
import { 
  FiArrowLeft, 
  FiImage, 
  FiTag, 
  FiCheck, 
  FiPlus, 
  FiUploadCloud,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  // Labels
  const [availableLabels, setAvailableLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);

  const [loading, setLoading] = useState(false);

  // Fetch labels
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const { data } = await labelAPI.getAll();
        if (data.success) {
          setAvailableLabels(data.data);
        }
      } catch (error) {
        console.error('Fetch labels error:', error);
      }
    };
    fetchLabels();
  }, []);

  // Handle file select
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh không được vượt quá 5MB');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleToggleLabel = (labelId) => {
    setSelectedLabels(prev => 
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Vui lòng nhập nội dung bài viết');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content);
      if (excerpt.trim()) formData.append('excerpt', excerpt.trim());
      formData.append('status', status);

      if (selectedLabels.length > 0) {
        formData.append('labels', JSON.stringify(selectedLabels));
      }

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const { data } = await postAPI.create(formData);
      if (data.success) {
        toast.success('Đăng bài viết thành công!');
        router.push(`/posts/${data.data.slug}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi đăng bài');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        <main style={{ flex: 1, padding: '40px 0' }}>
          <div className="page-container" style={{ maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <Link 
                href="/" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14 }}
              >
                <FiArrowLeft /> Hủy bỏ & Quay lại
              </Link>
              <h2 className="page-title" style={{ fontSize: 28, margin: 0 }}>
                Tạo bài viết mới
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 16 }}>
                  Tiêu đề bài viết *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 18, fontWeight: 600, padding: '14px 18px' }}
                  placeholder="Tiêu đề bài viết thật hấp dẫn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Excerpt */}
              <div className="form-group">
                <label className="form-label">
                  Mô tả ngắn (Tóm tắt hiển thị trên thẻ bài viết)
                </label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 70 }}
                  placeholder="Tóm tắt ngắn gọn 1-2 câu về nội dung chính của bài viết..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  maxLength={300}
                />
              </div>

              {/* Thumbnail Upload */}
              <div className="form-group">
                <label className="form-label">
                  Ảnh bìa (Thumbnail)
                </label>
                {thumbnailPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 10 }}>
                    <img 
                      src={thumbnailPreview} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      type="button"
                      onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 20px',
                    background: 'var(--bg-input)',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}>
                    <FiUploadCloud style={{ fontSize: 36, color: 'var(--accent-primary)', marginBottom: 8 }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Tải lên ảnh bìa cho bài viết</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Định dạng PNG, JPG, WebP tối đa 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleThumbnailChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
              </div>

              {/* Content Editor */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 16 }}>
                  Nội dung bài viết *
                </label>
                <QuillEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Chia sẻ kiến thức, hướng dẫn, hoặc câu chuyện của bạn ở đây..."
                />
              </div>

              {/* Labels Selector */}
              <div className="form-group">
                <div style={{ marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 2 }}>
                    Chủ đề & Nhãn (Labels)
                  </label>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Chọn các chủ đề phù hợp cho bài viết (nhãn do Ban Quản trị thiết lập)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {availableLabels.map((lbl) => {
                    const isSelected = selectedLabels.includes(lbl._id);
                    return (
                      <button
                        key={lbl._id}
                        type="button"
                        onClick={() => handleToggleLabel(lbl._id)}
                        className="btn btn-sm"
                        style={{
                          background: isSelected ? lbl.color : 'var(--bg-input)',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? lbl.color : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-full)',
                          fontSize: 12
                        }}
                      >
                        {isSelected && <FiCheck style={{ marginRight: 4 }} />}
                        #{lbl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Selector */}
              <div className="form-group">
                <label className="form-label">Trạng thái bài viết</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-select"
                  style={{ maxWidth: 260 }}
                >
                  <option value="published">Xuất bản công khai (Published)</option>
                  <option value="draft">Lưu bản nháp (Draft)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading}
                >
                  {loading ? 'Đang tải lên...' : 'Đăng bài viết'}
                </button>
              </div>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
