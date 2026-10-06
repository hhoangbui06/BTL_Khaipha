'use client';
import { useState, useEffect } from 'react';
import { labelAPI } from '@/lib/api';
import { FiPlus, FiTrash2, FiEdit, FiTag, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminLabelsPage() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  // New label state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit label state
  const [editingLabel, setEditingLabel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  const presetColors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', 
    '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#06b6d4', '#3b82f6'
  ];

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const { data } = await labelAPI.getAll();
      if (data.success) {
        setLabels(data.data);
      }
    } catch (error) {
      console.error('Fetch labels error:', error);
      toast.error('Không thể tải danh sách nhãn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên nhãn');
      return;
    }

    setCreating(true);
    try {
      const { data } = await labelAPI.create({
        name: name.trim(),
        color,
        description: description.trim()
      });
      if (data.success) {
        toast.success('Tạo nhãn mới thành công');
        setName('');
        setDescription('');
        setShowCreate(false);
        fetchLabels();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo nhãn');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (lbl) => {
    setEditingLabel(lbl);
    setEditName(lbl.name);
    setEditColor(lbl.color || '#6366f1');
    setEditDescription(lbl.description || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setUpdating(true);
    try {
      const { data } = await labelAPI.update(editingLabel._id, {
        name: editName.trim(),
        color: editColor,
        description: editDescription.trim()
      });
      if (data.success) {
        toast.success('Cập nhật nhãn thành công');
        setEditingLabel(null);
        fetchLabels();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật nhãn');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhãn này?')) return;

    try {
      const { data } = await labelAPI.delete(id);
      if (data.success) {
        toast.success('Đã xóa nhãn');
        fetchLabels();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa nhãn');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
            Quản lý Nhãn & Chủ đề
          </h1>
          <p className="page-subtitle">
            Tạo và chỉnh sửa các danh mục, thẻ phân loại bài viết trên hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn btn-primary"
        >
          <FiPlus /> Thêm nhãn mới
        </button>
      </div>

      {/* Labels Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : labels.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Thẻ hiển thị</th>
                <th>Tên nhãn</th>
                <th>Slug (Đường dẫn)</th>
                <th>Mô tả</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((lbl) => (
                <tr key={lbl._id}>
                  <td>
                    <span
                      className="post-label"
                      style={{
                        background: `${lbl.color}20`,
                        color: lbl.color,
                        border: `1px solid ${lbl.color}40`,
                        fontSize: 13,
                        padding: '4px 12px'
                      }}
                    >
                      #{lbl.name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lbl.name}
                  </td>
                  <td>
                    <code style={{ fontSize: 12 }}>{lbl.slug}</code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {lbl.description || '—'}
                  </td>
                  <td>
                    {format(new Date(lbl.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lbl)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px' }}
                        title="Sửa nhãn"
                      >
                        <FiEdit /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lbl._id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 10px' }}
                        title="Xóa nhãn"
                      >
                        <FiTrash2 /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Chưa có nhãn nào. Bấm "Thêm nhãn mới" để bắt đầu.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo nhãn chủ đề mới</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCreate(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên nhãn *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="vd: Trí tuệ nhân tạo, DevOps, v.v."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Màu sắc hiển thị</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-full)',
                          background: c,
                          border: color === c ? '2px solid white' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        {color === c && <FiCheck style={{ fontSize: 14 }} />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '100%', height: 38, cursor: 'pointer', border: 'none', background: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả nhãn</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Mô tả ngắn về chủ đề này..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn btn-secondary"
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Tạo nhãn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLabel && (
        <div className="modal-overlay" onClick={() => setEditingLabel(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chỉnh sửa nhãn</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingLabel(null)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên nhãn *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Màu sắc</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-full)',
                          background: c,
                          border: editColor === c ? '2px solid white' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        {editColor === c && <FiCheck style={{ fontSize: 14 }} />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ width: '100%', height: 38, cursor: 'pointer', border: 'none', background: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả nhãn</label>
                  <textarea
                    className="form-textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingLabel(null)}
                  className="btn btn-secondary"
                  disabled={updating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
