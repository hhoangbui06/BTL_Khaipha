const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin-controller');
const { requireAuth, requireAdmin, requireRole } = require('../middlewares/auth-middleware');
const { upload } = require('../middlewares/upload-middleware');

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User management (admin only)
router.get('/users', requireRole('admin', 'admin_support'), adminController.getAllUsers);
router.put('/users/:id', requireRole('admin'), adminController.updateUser);
router.delete('/users/:id', requireRole('admin'), adminController.deleteUser);

// Post management
router.get('/posts', requireRole('admin', 'admin_posts'), adminController.getAllPosts);
router.put('/posts/:id', requireRole('admin', 'admin_posts'), adminController.updatePostStatus);
router.delete('/posts/:id', requireRole('admin', 'admin_posts'), adminController.deletePost);
router.put('/posts/:id/labels', requireRole('admin', 'admin_posts'), adminController.setPostLabels);
router.delete('/posts/:id/labels', requireRole('admin', 'admin_posts'), adminController.removePostLabels);

// LDA auto-label tool
router.get('/lda/status', requireRole('admin', 'admin_posts'), adminController.getLdaStatus);
router.post('/lda/sync', requireRole('admin', 'admin_posts'), adminController.syncLda);
router.post('/lda/predict', requireRole('admin', 'admin_posts'), adminController.predictLda);

// Comment management
router.get('/comments', requireRole('admin', 'admin_posts', 'admin_support'), adminController.getAllComments);
router.delete('/comments/:id', requireRole('admin', 'admin_posts', 'admin_support'), adminController.deleteComment);

// Role Permissions Matrix (Admin only)
router.get('/roles/permissions', requireRole('admin'), adminController.getRolePermissions);
router.patch('/roles/permissions', requireRole('admin'), adminController.updateRolePermissions);

// Profile
router.get('/profile/:id', adminController.getUserProfile);

module.exports = router;
