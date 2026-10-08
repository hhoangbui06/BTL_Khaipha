const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { requireAuth } = require('../middlewares/auth-middleware');
const { uploadSingle } = require('../middlewares/upload-middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.get('/user/:id', authController.getUserProfile);

// Protected routes
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);
router.patch('/update-profile', requireAuth, authController.updateProfile);
router.patch('/change-password', requireAuth, authController.changePassword);
router.patch('/update-avatar', requireAuth, uploadSingle('avatar'), async (req, res) => {
  try {
    const { uploadToCloudinary } = require('../middlewares/upload-middleware');
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }
    const result = await uploadToCloudinary(req.file.buffer, 'blog/avatars');
    const User = require('../models/user-model');
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password -refreshToken');
    res.json({ success: true, message: 'Cập nhật ảnh đại diện thành công', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
