const jwt = require('jsonwebtoken');
const User = require('../models/user-model');

const JWT_SECRET = process.env.JWT_SECRET || 'btl_khaipha_jwt_secret_key_2024_secure';

// Verify JWT token - required authentication
module.exports.requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user || user.deleted || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Optional auth - attach user if token exists, but don't block
module.exports.optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user && !user.deleted && user.status === 'active') {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently continue without user
  }
  next();
};

// Check admin role
module.exports.requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'admin_posts', 'admin_support'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập'
    });
  }
  next();
};

// Check specific admin roles
module.exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next();
  };
};
