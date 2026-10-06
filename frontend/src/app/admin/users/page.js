'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import { 
  FiSearch, 
  FiUserCheck, 
  FiTrash2, 
  FiEdit, 
  FiShield, 
  FiCheck, 
  FiXCircle, 
  FiFilter,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const { data } = await adminAPI.getUsers(params);
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
    setNewStatus(user.status);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const { data } = await adminAPI.updateUser(editingUser._id, {
        role: newRole,
        status: newStatus
      });
      if (data.success) {
        toast.success('Cập nhật người dùng thành công');
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentAdmin?._id) {
      toast.error('Không thể xóa chính tài khoản của bạn');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;

    try {
      const { data } = await adminAPI.deleteUser(userId);
      if (data.success) {
        toast.success('Đã xóa người dùng');
        fetchUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-primary">👑 Admin Tổng</span>;
      case 'admin_posts':
        return <span className="badge badge-info">✍️ Admin Bài viết</span>;
      case 'admin_support':
        return <span className="badge badge-warning">🎧 Admin CSKH</span>;
      default:
        return <span className="badge badge-success">👤 Thành viên</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Hoạt động</span>;
      case 'inactive':
        return <span className="badge badge-warning">Chưa kích hoạt</span>;
      case 'banned':
        return <span className="badge badge-error">Bị khóa</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const isSuperAdmin = currentAdmin?.role === 'admin';

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
          Quản lý người dùng
        </h1>
        <p className="page-subtitle">
          Danh sách người dùng, kiểm soát trạng thái tài khoản và phân quyền quản trị viên.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin Tổng</option>
          <option value="admin_posts">Admin Quản lý bài viết</option>
          <option value="admin_support">Admin Chăm sóc khách hàng</option>
          <option value="user">Thành viên thông thường</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Chưa kích hoạt</option>
          <option value="banned">Bị khóa (Banned)</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : users.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                {isSuperAdmin && <th style={{ textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={u.avatar || 'https://res.cloudinary.com/dwmzdnacn/image/upload/v1778812647/t%E1%BA%A3i_xu%E1%BB%91ng_aarq4c.png'}
                        alt={u.fullName}
                        style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.fullName}
                      </span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>{getStatusBadge(u.status)}</td>
                  <td>{format(new Date(u.createdAt), 'dd/MM/yyyy')}</td>
                  {isSuperAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="btn btn-secondary btn-sm"
                          title="Chỉnh sửa quyền / trạng thái"
                        >
                          <FiEdit /> Sửa
                        </button>
                        {u._id !== currentAdmin?._id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u._id)}
                            className="btn btn-danger btn-sm"
                            title="Xóa người dùng"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <div className="empty-state">
          <p>Không tìm thấy người dùng phù hợp.</p>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật quyền & trạng thái</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingUser(null)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <strong>Người dùng:</strong> {editingUser.fullName} ({editingUser.email})
                </div>

                <div className="form-group">
                  <label className="form-label">Phân quyền (Role)</label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="user">Thành viên (User)</option>
                    <option value="admin_posts">Admin Quản lý bài viết (admin_posts)</option>
                    <option value="admin_support">Admin Chăm sóc khách hàng (admin_support)</option>
                    <option value="admin">Admin Tổng (admin)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái (Status)</label>
                  <select
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="active">Hoạt động (Active)</option>
                    <option value="inactive">Chưa kích hoạt (Inactive)</option>
                    <option value="banned">Khóa tài khoản (Banned)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
