const Label = require('../models/label-model');
const { notifyDataChanged } = require('../helpers/lda-tool-helper');

// Create label
module.exports.create = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên label'
      });
    }

    const existingLabel = await Label.findOne({ name, deleted: false });
    if (existingLabel) {
      return res.status(400).json({
        success: false,
        message: 'Label đã tồn tại'
      });
    }

    const label = await Label.create({ name, description, color });

    res.status(201).json({
      success: true,
      message: 'Tạo label thành công',
      data: label
    });
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get all labels
module.exports.getAll = async (req, res) => {
  try {
    const labels = await Label.find({ deleted: false }).sort({ name: 1 });

    res.json({
      success: true,
      data: labels
    });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Update label
module.exports.update = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const label = await Label.findById(req.params.id);
    if (!label || label.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Label không tồn tại'
      });
    }

    if (name) label.name = name;
    if (description !== undefined) label.description = description;
    if (color) label.color = color;

    await label.save();
    notifyDataChanged();

    res.json({
      success: true,
      message: 'Cập nhật label thành công',
      data: label
    });
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Delete label (soft)
module.exports.delete = async (req, res) => {
  try {
    const label = await Label.findById(req.params.id);
    if (!label || label.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Label không tồn tại'
      });
    }

    label.deleted = true;
    label.deletedAt = new Date();
    await label.save({ validateBeforeSave: false });
    notifyDataChanged();

    res.json({
      success: true,
      message: 'Xóa label thành công'
    });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};
