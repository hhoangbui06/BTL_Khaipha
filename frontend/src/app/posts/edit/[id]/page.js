'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import QuillEditor from '@/components/QuillEditor';
import { postAPI, labelAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  FiArrowLeft, 
  FiImage, 
  FiTag, 
  FiCheck, 
  FiUploadCloud,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EditPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [availableLabels, setAvailableLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postSlug, setPostSlug] = useState('');

  // Fetch labels & post
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [labelsRes, postRes] = await Promise.all([
          labelAPI.getAll(),
          postAPI.getById(id)
        ]);

        if (labelsRes.data.success) {
          setAvailableLabels(labelsRes.data.data);
        }

        if (postRes.data.success) {
          const p = postRes.data.data;

          // Check authorization
          if (user && p.author?._id !== user._id && !['admin', 'admin_posts'].includes(user.role)) {
            toast.error('Bạn không có quyền chỉnh sửa bài viết này');
            router.push('/');
            return;
          }

          setTitle(p.title || '');
          setExcerpt(p.excerpt || '');
          setContent(p.content || '');
          setStatus(p.status || 'published');
          setThumbnailPreview(p.thumbnail || '');
          setPostSlug(p.slug || '');
          if (p.labels) {
            setSelectedLabels(p.labels.map(l => typeof l === 'object' ? l._id : l));
          }
        }
      } catch (error) {
        console.error('Fetch edit data error:', error);
        toast.error('Không tìm thấy bài viết');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, router]);

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
      prev.includes(labelId) ? prev.filter(i => i !== labelId) : [...prev, labelId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }

    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content);
      if (excerpt.trim()) formData.append('excerpt', excerpt.trim());
      formData.append('status', status);

      // Luôn gửi danh sách nhãn (kể cả rỗng) để việc bỏ chọn hết nhãn được lưu lại
      formData.append('labels', JSON.stringify(selectedLabels));

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const { data } = await postAPI.update(id, formData);
      if (data.success) {
        toast.success('Cập nhật bài viết thành công!');
        router.push(`/posts/${data.data.slug || postSlug}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật bài viết');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div className="loading-spinner" style={{ flex: 1 }}>
          <div className="spinner" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        <main style={{ flex: 1, padding: '40px 0' }}>
          <div className="page-container" style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <button 
                type="button"
                onClick={() => router.back()}
                className="btn btn-ghost"
                style={{ fontSize: 14 }}
              >
                <FiArrowLeft /> Quay lại
              </button>
              <h2 className="page-title" style={{ fontSize: 28, margin: 0 }}>
                Chỉnh sửa bài viết
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 16 }}>
                  Tiêu đề bài viết *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 18, fontWeight: 600, padding: '14px 18px' }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mô tả ngắn
                </label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 70 }}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  maxLength={300}
                />
              </div>

              {/* Thumbnail */}
              <div className="form-group">
                <label className="form-label">
                  Ảnh bìa
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
                    cursor: 'pointer'
                  }}>
                    <FiUploadCloud style={{ fontSize: 36, color: 'var(--accent-primary)', marginBottom: 8 }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Tải ảnh bìa mới</span>
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
                />
              </div>

              {/* Labels */}
              <div className="form-group">
                <label className="form-label">
                  Chủ đề & Nhãn (Labels)
                </label>
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

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Trạng thái bài viết</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-select"
                  style={{ maxWidth: 260 }}
                >
                  <option value="published">Xuất bản công khai (Published)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
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
