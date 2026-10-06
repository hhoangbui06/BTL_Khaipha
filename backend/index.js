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
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin === 'http://localhost:3000' ||
      (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) ||
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
