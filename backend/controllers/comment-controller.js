const Comment = require('../models/comment-model');

// Create comment
module.exports.create = async (req, res) => {
  try {
    const { content, postId, parentComment } = req.body;

    if (!content || !postId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung bình luận'
      });
    }

    const commentData = {
      content,
      post: postId,
      author: req.user._id,
    };

    if (parentComment) {
      commentData.parentComment = parentComment;
    }

    const comment = await Comment.create(commentData);
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'fullName avatar');

    res.status(201).json({
      success: true,
      message: 'Bình luận thành công',
      data: populatedComment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get comments by post
module.exports.getByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const query = {
      post: postId,
      deleted: false,
      parentComment: null // Only root comments
    };

    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate('author', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Get replies for each comment
    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({
      parentComment: { $in: commentIds },
      deleted: false
    }).populate('author', 'fullName avatar')
      .sort({ createdAt: 1 });

    const repliesMap = {};
    replies.forEach(reply => {
      const parentId = reply.parentComment.toString();
      if (!repliesMap[parentId]) repliesMap[parentId] = [];
      repliesMap[parentId].push(reply);
    });

    const commentsWithReplies = comments.map(comment => {
      const c = comment.toJSON();
      c.replies = repliesMap[c._id.toString()] || [];
      return c;
    });

    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Update comment
module.exports.update = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bình luận không tồn tại'
      });
    }

    if (comment.author.toString() !== req.user._id.toString() &&
        !['admin', 'admin_posts'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa bình luận này'
      });
    }

    comment.content = req.body.content;
    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate('author', 'fullName avatar');

    res.json({
      success: true,
      message: 'Cập nhật bình luận thành công',
      data: updatedComment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Delete comment (soft)
module.exports.delete = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bình luận không tồn tại'
      });
    }

    if (comment.author.toString() !== req.user._id.toString() &&
        !['admin', 'admin_posts'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      });
    }

    comment.deleted = true;
    comment.deletedAt = new Date();
    await comment.save({ validateBeforeSave: false });

    // Also soft delete replies
    await Comment.updateMany(
      { parentComment: comment._id },
      { deleted: true, deletedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Xóa bình luận thành công'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Like comment
module.exports.toggleLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bình luận không tồn tại'
      });
    }

    const userId = req.user._id;
    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
    }

    await comment.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        liked: !isLiked,
        likeCount: comment.likes.length
      }
    });
  } catch (error) {
    console.error('Toggle like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};
