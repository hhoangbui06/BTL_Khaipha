'use client';
import React, { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  FiShield, 
  FiKey, 
  FiCheck, 
  FiSave, 
  FiRefreshCw, 
  FiAlertCircle,
  FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminRolesPermissionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  // rolePermissions: { [roleSlug or roleId]: Set<permissionId> }
  const [rolePermissions, setRolePermissions] = useState({});

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getRolePermissions();
      if (data.success) {
        setGroups(data.data.groups || []);
        const loadedRoles = data.data.roles || [];
        setRoles(loadedRoles);

        const permMap = {};
        loadedRoles.forEach(r => {
          permMap[r._id] = new Set(r.permissions || []);
        });
        setRolePermissions(permMap);
      }
    } catch (error) {
      console.error('Fetch permissions error:', error);
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (roleId, permissionId) => {
    setRolePermissions(prev => {
      const currentSet = new Set(prev[roleId] || []);
      if (currentSet.has(permissionId)) {
        currentSet.delete(permissionId);
      } else {
        currentSet.add(permissionId);
      }
      return {
        ...prev,
        [roleId]: currentSet
      };
    });
  };

  const handleToggleAllForRole = (roleId) => {
    // All permission ids
    const allPermIds = [];
    groups.forEach(g => {
      g.permissions.forEach(p => allPermIds.push(p.id));
    });

    setRolePermissions(prev => {
      const currentSet = new Set(prev[roleId] || []);
      const isAllChecked = allPermIds.every(id => currentSet.has(id));

      const newSet = isAllChecked ? new Set() : new Set(allPermIds);
      return {
        ...prev,
        [roleId]: newSet
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = roles.map(r => ({
        id: r._id,
        slug: r.slug,
        permissions: Array.from(rolePermissions[r._id] || [])
      }));

      const { data } = await adminAPI.updateRolePermissions(payload);
      if (data.success) {
        toast.success(data.message || 'Đã lưu cấu hình phân quyền thành công!');
      }
    } catch (error) {
      console.error('Save permissions error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu phân quyền');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // All permission ids flattened
  const allPermIds = [];
  groups.forEach(g => {
    g.permissions.forEach(p => allPermIds.push(p.id));
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              <FiKey />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Ma Trận Phân Quyền Hệ Thống</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Thiết lập chi tiết quyền hạn thao tác cho từng vai trò người dùng trong hệ thống
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={fetchPermissions}
            className="btn btn-secondary"
            disabled={saving}
          >
            <FiRefreshCw /> Tải lại
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving}
          >
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu cập nhật phân quyền'}
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 18px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--text-secondary)'
      }}>
        <FiInfo style={{ color: 'var(--accent-primary)', fontSize: 18, flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Lưu ý về cơ chế phân quyền:</strong> Tích chọn các ô tương ứng để cấp quyền thực hiện chức năng cho vai trò đó. Sau khi hoàn tất điều chỉnh, hãy nhấn nút <strong>"Lưu cập nhật phân quyền"</strong> ở góc trên bên phải để áp dụng thay đổi.
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="table-responsive" style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '16px 20px', textAlign: 'left', minWidth: 260, fontSize: 14, fontWeight: 700 }}>
                Tính năng & Phân hệ
              </th>
              {roles.map(r => (
                <th 
                  key={r._id} 
                  style={{ 
                    padding: '16px 16px', 
                    textAlign: 'center', 
                    minWidth: 140,
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                    ({r.slug})
                  </div>
                </th>
              ))}
            </tr>

            {/* Check all row */}
            <tr style={{ background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px 20px', fontWeight: 600, fontSize: 13, color: 'var(--accent-primary)' }}>
                ⚡ Chọn tất cả quyền
              </td>
              {roles.map(r => {
                const checkedCount = (allPermIds.filter(id => rolePermissions[r._id]?.has(id))).length;
                const isAll = checkedCount === allPermIds.length && allPermIds.length > 0;
                return (
                  <td key={r._id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={isAll}
                      onChange={() => handleToggleAllForRole(r._id)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                      title={`Chọn hoặc bỏ chọn tất cả quyền cho ${r.title}`}
                    />
                  </td>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {groups.map((group, gIdx) => (
              <React.Fragment key={group.name}>
                {/* Group Header Row */}
                <tr style={{
                  background: 'rgba(99, 102, 241, 0.07)',
                  borderTop: gIdx > 0 ? '2px solid var(--border-color)' : 'none',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <td 
                    colSpan={roles.length + 1}
                    style={{
                      padding: '12px 20px',
                      fontWeight: 800,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--accent-primary)'
                    }}
                  >
                    📁 {group.name}
                  </td>
                </tr>

                {/* Group Permissions */}
                {group.permissions.map(perm => (
                  <tr 
                    key={perm.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background var(--transition-fast)'
                    }}
                    className="hover-row"
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 500 }}>{perm.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mã: {perm.id}</div>
                    </td>

                    {roles.map(r => {
                      const isChecked = rolePermissions[r._id]?.has(perm.id) || false;
                      return (
                        <td key={r._id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(r._id, perm.id)}
                            style={{
                              width: 17,
                              height: 17,
                              cursor: 'pointer',
                              accentColor: 'var(--accent-primary)'
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Save Action */}
      <div style={{
        marginTop: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12
      }}>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary btn-lg"
          disabled={saving}
          style={{ minWidth: 220 }}
        >
          <FiSave /> {saving ? 'Đang lưu cập nhật...' : 'Lưu ma trận phân quyền'}
        </button>
      </div>
    </div>
  );
}
