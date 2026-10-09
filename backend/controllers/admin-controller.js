const mongoose = require('mongoose');
const User = require('../models/user-model');
const Post = require('../models/post-model');
const Comment = require('../models/comment-model');
const Label = require('../models/label-model');
const { uploadToCloudinary } = require('../middlewares/upload-middleware');
const { callTool, notifyDataChanged } = require('../helpers/lda-tool-helper');

// Dashboard stats
module.exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalComments, totalLabels] = await Promise.all([
      User.countDocuments({ deleted: false }),
      Post.countDocuments({ deleted: false }),
      Comment.countDocuments({ deleted: false }),
      Label.countDocuments({ deleted: false })
    ]);

    // Recent posts
    const recentPosts = await Post.find({ deleted: false })
      .populate('author', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent users
    const recentUsers = await User.find({ deleted: false })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(5);

    // Posts by status
    const postsByStatus = await Post.aggregate([
      { $match: { deleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        stats: { totalUsers, totalPosts, totalComments, totalLabels },
        recentPosts,
        recentUsers,
        postsByStatus
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Get all users (admin)
module.exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    const query = { deleted: false };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Update user role/status (admin)
module.exports.updateUser = async (req, res) => {
  try {
    const { role, status } = req.body;
    const updateData = {};

    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật thành công',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Delete user (soft)
module.exports.deleteUser = async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa chính mình'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Get all posts (admin - includes all statuses)
module.exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', label = '' } = req.query;
    const query = { deleted: false };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (label) query.labels = label;

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'fullName avatar email')
      .populate('labels', 'name slug color')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Admin get posts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Update post status (admin)
module.exports.updatePostStatus = async (req, res) => {
  try {
    const { status, featured } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (featured !== undefined) updateData.featured = featured;

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('author', 'fullName avatar')
      .populate('labels', 'name slug color');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật thành công',
      data: post
    });
  } catch (error) {
    console.error('Update post status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Delete post (admin)
module.exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }
    notifyDataChanged();

    res.json({
      success: true,
      message: 'Xóa bài viết thành công'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Assign labels to a post (admin) - có thể tạo nhãn mới ngay khi gán
module.exports.setPostLabels = async (req, res) => {
  try {
    const { labelIds = [], newLabels = [] } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    // Mỗi bài viết có tối đa 2 nhãn: nhãn có sẵn được chọn trước, sau đó tới nhãn mới tạo
    const MAX_LABELS_PER_POST = 2;
    const ids = [];
    const addId = (id) => {
      const key = id.toString();
      if (!ids.includes(key) && ids.length < MAX_LABELS_PER_POST) ids.push(key);
    };

    for (const id of labelIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;
      const label = await Label.findOne({ _id: id, deleted: false }).select('_id');
      if (label) addId(label._id);
    }

    for (const item of newLabels) {
      const name = (item.name || '').trim();
      if (!name || ids.length >= MAX_LABELS_PER_POST) continue;
      let label = await Label.findOne({ name });
      if (!label) {
        label = await Label.create({ name, color: item.color || '#6366f1', description: item.description || '' });
      } else if (label.deleted) {
        // Tên trùng với nhãn đã xóa mềm -> khôi phục lại nhãn đó
        label.deleted = false;
        label.deletedAt = undefined;
        label.color = item.color || label.color;
        await label.save();
      }
      addId(label._id);
    }

    post.labels = ids;
    post.autoLabeled = false; // admin đã xác nhận nhãn
    post.autoLabelDisabled = ids.length === 0; // admin bỏ trống nhãn -> Tool không tự gán lại
    post.autoLabelScore = undefined;
    post.autoLabelShares = undefined;
    post.autoLabelModel = undefined;
    await post.save({ validateBeforeSave: false });
    notifyDataChanged();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'fullName avatar email')
      .populate('labels', 'name slug color');

    res.json({
      success: true,
      message: 'Đã gán nhãn cho bài viết',
      data: updatedPost
    });
  } catch (error) {
    console.error('Set post labels error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Remove label of a post (admin) - Tool sẽ không tự gán lại nhãn cho bài này
module.exports.removePostLabels = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    post.labels = [];
    post.autoLabeled = false;
    post.autoLabelDisabled = true;
    post.autoLabelScore = undefined;
    post.autoLabelShares = undefined;
    post.autoLabelModel = undefined;
    post.autoLabeledAt = undefined;
    await post.save({ validateBeforeSave: false });
    notifyDataChanged();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'fullName avatar email')
      .populate('labels', 'name slug color');

    res.json({
      success: true,
      message: 'Đã xóa nhãn của bài viết',
      data: updatedPost
    });
  } catch (error) {
    console.error('Remove post labels error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// LDA Tool: trạng thái mô hình
module.exports.getLdaStatus = async (req, res) => {
  try {
    const { data } = await callTool('GET', '/api/status', null, 30000);
    res.json({ success: true, data });
  } catch (error) {
    res.status(502).json({ success: false, message: `Không kết nối được LDA Tool: ${error.message}` });
  }
};

// LDA Tool: đồng bộ (huấn luyện lại nếu cần + gán nhãn bài còn thiếu)
module.exports.syncLda = async (req, res) => {
  try {
    const { data } = await callTool('POST', '/api/sync', {
      force: !!req.body.force,
      relabelAuto: !!req.body.relabelAuto
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(502).json({ success: false, message: `LDA Tool lỗi: ${error.message}` });
  }
};

// LDA Tool: dự đoán thử nhãn cho một đoạn văn bản
module.exports.predictLda = async (req, res) => {
  try {
    const { title = '', content = '' } = req.body;
    const { data } = await callTool('POST', '/api/predict', { title, content });
    res.json({ success: true, data });
  } catch (error) {
    res.status(502).json({ success: false, message: `LDA Tool lỗi: ${error.message}` });
  }
};

// Get all comments (admin)
module.exports.getAllComments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = { deleted: false };

    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate('author', 'fullName avatar email')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Admin get comments error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Delete comment (admin)
module.exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Bình luận không tồn tại'
      });
    }

    // Also delete replies
    await Comment.updateMany(
      { parentComment: comment._id },
      { deleted: true, deletedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Xóa bình luận thành công'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Upload avatar (admin)
module.exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh'
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'blog/avatars');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: user
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Get user profile (public)
module.exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('fullName avatar bio createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    const postCount = await Post.countDocuments({
      author: user._id,
      deleted: false,
      status: 'published'
    });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        postCount
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ========================
// ROLE & PERMISSIONS MATRIX
// ========================
const Role = require('../models/role-model');

const PERMISSION_GROUPS = [
  {
    name: 'Quản lý Bài viết',
    permissions: [
      { id: 'posts_view', label: 'Xem danh sách bài viết' },
      { id: 'posts_create', label: 'Đăng bài viết mới' },
      { id: 'posts_edit', label: 'Chỉnh sửa bài viết' },
      { id: 'posts_approve', label: 'Kiểm duyệt bài viết (Duyệt/Từ chối)' },
      { id: 'posts_feature', label: 'Ghim bài viết nổi bật' },
      { id: 'posts_delete', label: 'Xóa bài viết' }
    ]
  },
  {
    name: 'Quản lý Bình luận',
    permissions: [
      { id: 'comments_view', label: 'Xem danh sách bình luận' },
      { id: 'comments_create', label: 'Viết bình luận bài viết' },
      { id: 'comments_delete', label: 'Kiểm duyệt & Xóa bình luận vi phạm' }
    ]
  },
  {
    name: 'Quản lý Nhãn & Chủ đề',
    permissions: [
      { id: 'labels_view', label: 'Xem danh sách nhãn chủ đề' },
      { id: 'labels_create', label: 'Tạo nhãn chủ đề mới' },
      { id: 'labels_edit', label: 'Chỉnh sửa nhãn chủ đề' },
      { id: 'labels_delete', label: 'Xóa nhãn chủ đề' }
    ]
  },
  {
    name: 'Người dùng & Phân quyền',
    permissions: [
      { id: 'users_view', label: 'Xem danh sách người dùng' },
      { id: 'users_status', label: 'Khóa / Mở khóa tài khoản' },
      { id: 'users_role', label: 'Thay đổi vai trò người dùng' },
      { id: 'users_delete', label: 'Xóa tài khoản người dùng' },
      { id: 'roles_permissions', label: 'Thiết lập ma trận phân quyền' }
    ]
  },
  {
    name: 'Hệ thống & Báo cáo',
    permissions: [
      { id: 'dashboard_view', label: 'Xem bảng tổng quan Dashboard' }
    ]
  }
];

const DEFAULT_ROLES = [
  {
    title: 'Admin Tổng',
    slug: 'admin',
    description: 'Toàn quyền kiểm soát và điều hành toàn bộ hệ thống',
    permissions: [
      'posts_view', 'posts_create', 'posts_edit', 'posts_approve', 'posts_feature', 'posts_delete',
      'comments_view', 'comments_create', 'comments_delete',
      'labels_view', 'labels_create', 'labels_edit', 'labels_delete',
      'users_view', 'users_status', 'users_role', 'users_delete', 'roles_permissions',
      'dashboard_view'
    ]
  },
  {
    title: 'Admin Bài viết',
    slug: 'admin_posts',
    description: 'Chuyên trách kiểm duyệt, biên tập nội dung bài viết và nhãn',
    permissions: [
      'posts_view', 'posts_create', 'posts_edit', 'posts_approve', 'posts_feature', 'posts_delete',
      'comments_view', 'comments_create', 'comments_delete',
      'labels_view', 'labels_create', 'labels_edit', 'labels_delete',
      'dashboard_view'
    ]
  },
  {
    title: 'Admin CSKH',
    slug: 'admin_support',
    description: 'Chăm sóc hỗ trợ người dùng và kiểm duyệt bình luận',
    permissions: [
      'posts_view',
      'comments_view', 'comments_create', 'comments_delete',
      'users_view', 'users_status',
      'dashboard_view'
    ]
  },
  {
    title: 'Thành viên',
    slug: 'user',
    description: 'Người dùng thông thường, đăng bài và tương tác cộng đồng',
    permissions: [
      'posts_view', 'posts_create',
      'comments_view', 'comments_create',
      'labels_view'
    ]
  }
];

// Get role permissions matrix
module.exports.getRolePermissions = async (req, res) => {
  try {
    // Ensure default roles exist in DB
    for (const def of DEFAULT_ROLES) {
      const exists = await Role.findOne({ slug: def.slug, deleted: false });
      if (!exists) {
        await Role.create(def);
      }
    }

    const roles = await Role.find({ deleted: false }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        groups: PERMISSION_GROUPS,
        roles
      }
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Update role permissions matrix
module.exports.updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    // permissions is an array of { id, permissions: [...] } or { slug, permissions: [...] }
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phân quyền không hợp lệ' });
    }

    for (const item of permissions) {
      const query = item.id ? { _id: item.id } : { slug: item.slug };
      await Role.updateOne(query, { permissions: item.permissions || [] });
    }

    res.json({
      success: true,
      message: 'Cập nhật phân quyền thành công!'
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
