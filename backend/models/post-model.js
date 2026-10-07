const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề'],
    trim: true
  },
  slug: {
    type: String,
    slug: 'title',
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Vui lòng nhập nội dung']
  },
  excerpt: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  status: {
    type: String,
    enum: ['published', 'draft', 'pending', 'rejected'],
    default: 'published'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shareCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  // Nhãn do LDA Tool tự gán (false = nhãn do người dùng/admin gán)
  autoLabeled: {
    type: Boolean,
    default: false
  },
  autoLabelScore: Number,
  autoLabelModel: String,
  autoLabeledAt: Date,
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Index for search
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

const Post = mongoose.model('Post', postSchema, 'posts');
module.exports = Post;
