const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const database = require('./config/database');
const authRoute = require('./routes/auth-route');
const postRoute = require('./routes/post-route');
const commentRoute = require('./routes/comment-route');
const labelRoute = require('./routes/label-route');
const adminRoute = require('./routes/admin-route');

const app = express();

// Connect Database
database.connect();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://btl-khaipha.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Ensure database is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await database.connect();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Không thể kết nối cơ sở dữ liệu MongoDB Atlas'
    });
  }
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/posts', postRoute);
app.use('/api/comments', commentRoute);
app.use('/api/labels', labelRoute);
app.use('/api/admin', adminRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Blog API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Blog API running on port ${PORT}`);
  });
}

module.exports = app;
