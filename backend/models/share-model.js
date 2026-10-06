const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure a user can only share a post once to their wall
shareSchema.index({ post: 1, user: 1 }, { unique: true });

const Share = mongoose.model('Share', shareSchema, 'shares');
module.exports = Share;
