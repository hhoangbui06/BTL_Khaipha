const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên label'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    slug: 'name',
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

const Label = mongoose.model('Label', labelSchema, 'labels');
module.exports = Label;
