const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user-model');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../helpers/send-mail-helper');

const JWT_SECRET = process.env.JWT_SECRET || 'btl_khaipha_jwt_secret_key_2024_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'btl_khaipha_jwt_refresh_secret_key_2024';

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
  return { accessToken, refreshToken };
};

// Register
module.exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu ít nhất 6 ký tự'
      });
    }

    const existingUser = await User.findOne({ email, deleted: false });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      fullName,
      email,
      password,
      verifyEmailToken: verifyToken,
      verifyEmailExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      emailVerified: false
    });

    // Send verification email safely without blocking registration if mail server fails
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (mailError) {
      console.warn('Gửi email xác thực thất bại:', mailError.message);
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server'
    });
  }
};

// Login
module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    const user = await User.findOne({ email, deleted: false });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server'
    });
  }
};

// Admin Login (dedicated for admin management portal)
module.exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng kiểm tra tài khoản hoặc mật khẩu'
      });
    }

    const user = await User.findOne({ email, deleted: false });
    // If user does not exist OR is a standard member (role: user):
    // Refuse admin access with error: 'Vui lòng kiểm tra tài khoản hoặc mật khẩu'
    if (!user || user.role === 'user' || !['admin', 'admin_posts', 'admin_support'].includes(user.role)) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng kiểm tra tài khoản hoặc mật khẩu'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng kiểm tra tài khoản hoặc mật khẩu'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Đăng nhập trang quản trị thành công',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Verify Email
module.exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      verifyEmailToken: token,
      verifyEmailExpires: { $gt: Date.now() },
      deleted: false
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.emailVerified = true;
    user.verifyEmailToken = undefined;
    user.verifyEmailExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Xác thực email thành công!'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Forgot Password
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, deleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email không tồn tại trong hệ thống'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    await sendResetPasswordEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Đã gửi email đặt lại mật khẩu'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Reset Password
module.exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu ít nhất 6 ký tự'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
      deleted: false
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công!'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Refresh Token
module.exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Logout
module.exports.logout = async (req, res) => {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get current user
module.exports.getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Update profile
module.exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, phone, address } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Cập nhật thành công',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Change password
module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới ít nhất 6 ký tự'
      });
    }

    const user = await User.findById(req.user._id);
    const isValid = await user.comparePassword(currentPassword);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get public user profile
module.exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('fullName avatar bio createdAt role');

    if (!user || user.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    const Post = require('../models/post-model');
    const Share = require('../models/share-model');

    const [postCount, shareCount] = await Promise.all([
      Post.countDocuments({ author: user._id, deleted: false, status: 'published' }),
      Share.countDocuments({ user: user._id, deleted: false })
    ]);

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        postCount,
        shareCount
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};
