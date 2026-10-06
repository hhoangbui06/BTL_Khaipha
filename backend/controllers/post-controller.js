const mongoose = require('mongoose');
const Post = require('../models/post-model');
const Comment = require('../models/comment-model');
const Share = require('../models/share-model');
const { uploadToCloudinary } = require('../middlewares/upload-middleware');

// Create post
module.exports.create = async (req, res) => {
  try {
    const { title, content, excerpt, labels, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tiêu đề và nội dung'
      });
    }

    const postData = {
      title,
      content,
      excerpt: excerpt || content.replace(/<[^>]+>/g, '').substring(0, 200),
      author: req.user._id,
      status: status || 'published'
    };

    if (labels) {
      if (typeof labels === 'string') {
        try {
          postData.labels = JSON.parse(labels);
        } catch (e) {
          postData.labels = labels.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(labels)) {
        postData.labels = labels;
      }
    }

    // Handle thumbnail upload
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'blog/posts');
      postData.thumbnail = result.secure_url;
    }

    const post = await Post.create(postData);
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'fullName avatar')
      .populate('labels', 'name slug color');

    res.status(201).json({
      success: true,
      message: 'Đăng bài thành công',
      data: populatedPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get single post by ID
module.exports.getById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'fullName avatar bio')
      .populate('labels', 'name slug color');

    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    const commentCount = await Comment.countDocuments({ post: post._id, deleted: false });
    const postData = post.toJSON();
    postData.commentCount = commentCount;
    postData.likeCount = post.likes ? post.likes.length : 0;

    res.json({
      success: true,
      data: postData
    });
  } catch (error) {
    console.error('Get post by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get all posts (public) with sorting & filtering
module.exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'newest',
      search = '',
      label = '',
      author = ''
    } = req.query;

    const query = { deleted: false, status: 'published' };

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by label
    if (label) {
      query.labels = label;
    }

    // Filter by author
    if (author) {
      query.author = author;
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'most_likes':
        sortOption = { 'likesCount': -1, createdAt: -1 };
        break;
      case 'most_comments':
        sortOption = { createdAt: -1 }; // will be handled by aggregation
        break;
      case 'most_shares':
        sortOption = { shareCount: -1, createdAt: -1 };
        break;
      case 'random':
        // Handle random separately
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts;
    let total;

    if (sort === 'random') {
      const matchQuery = { ...query };
      if (label && mongoose.Types.ObjectId.isValid(label)) {
        matchQuery.labels = new mongoose.Types.ObjectId(label);
      }
      if (author && mongoose.Types.ObjectId.isValid(author)) {
        matchQuery.author = new mongoose.Types.ObjectId(author);
      }
      total = await Post.countDocuments(query);
      posts = await Post.aggregate([
        { $match: matchQuery },
        { $sample: { size: parseInt(limit) } }
      ]);
      // Populate after aggregate
      posts = await Post.populate(posts, [
        { path: 'author', select: 'fullName avatar' },
        { path: 'labels', select: 'name slug color' }
      ]);
    } else if (sort === 'most_comments') {
      // Use aggregation for comment count sort
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'post',
            pipeline: [{ $match: { deleted: false } }],
            as: 'comments'
          }
        },
        { $addFields: { commentCount: { $size: '$comments' } } },
        { $sort: { commentCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        { $project: { comments: 0 } }
      ];

      posts = await Post.aggregate(pipeline);
      posts = await Post.populate(posts, [
        { path: 'author', select: 'fullName avatar' },
        { path: 'labels', select: 'name slug color' }
      ]);
      total = await Post.countDocuments(query);
    } else if (sort === 'most_likes') {
      const pipeline = [
        { $match: query },
        { $addFields: { likesCount: { $size: '$likes' } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ];

      posts = await Post.aggregate(pipeline);
      posts = await Post.populate(posts, [
        { path: 'author', select: 'fullName avatar' },
        { path: 'labels', select: 'name slug color' }
      ]);
      total = await Post.countDocuments(query);
    } else {
      total = await Post.countDocuments(query);
      posts = await Post.find(query)
        .populate('author', 'fullName avatar')
        .populate('labels', 'name slug color')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));
    }

    // Get comment counts for each post
    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds }, deleted: false } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const commentCountMap = {};
    commentCounts.forEach(c => { commentCountMap[c._id.toString()] = c.count; });

    const postsWithCounts = posts.map(p => {
      const post = p.toJSON ? p.toJSON() : p;
      post.commentCount = commentCountMap[post._id.toString()] || 0;
      post.likeCount = post.likes ? post.likes.length : 0;
      return post;
    });

    res.json({
      success: true,
      data: {
        posts: postsWithCounts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get single post by slug
module.exports.getBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      deleted: false,
      status: 'published'
    })
      .populate('author', 'fullName avatar bio')
      .populate('labels', 'name slug color');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save({ validateBeforeSave: false });

    // Get comment count
    const commentCount = await Comment.countDocuments({ post: post._id, deleted: false });

    const postData = post.toJSON();
    postData.commentCount = commentCount;
    postData.likeCount = post.likes.length;

    res.json({
      success: true,
      data: postData
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Update post
module.exports.update = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    // Only author or admin can update
    if (post.author.toString() !== req.user._id.toString() &&
        !['admin', 'admin_posts'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa bài viết này'
      });
    }

    const { title, content, excerpt, labels, status } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    if (status) post.status = status;
    if (labels) {
      if (typeof labels === 'string') {
        try {
          post.labels = JSON.parse(labels);
        } catch (e) {
          post.labels = labels.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(labels)) {
        post.labels = labels;
      }
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'blog/posts');
      post.thumbnail = result.secure_url;
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'fullName avatar')
      .populate('labels', 'name slug color');

    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Delete post (soft delete)
module.exports.delete = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    // Only author or admin can delete
    if (post.author.toString() !== req.user._id.toString() &&
        !['admin', 'admin_posts'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bài viết này'
      });
    }

    post.deleted = true;
    post.deletedAt = new Date();
    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Xóa bài viết thành công'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Like / Unlike post
module.exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        liked: !isLiked,
        likeCount: post.likes.length
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Share post to wall
module.exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bài viết không tồn tại'
      });
    }

    const existingShare = await Share.findOne({
      post: post._id,
      user: req.user._id
    });

    if (existingShare && !existingShare.deleted) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã chia sẻ bài viết này rồi'
      });
    }

    if (existingShare && existingShare.deleted) {
      existingShare.deleted = false;
      existingShare.note = req.body.note || '';
      await existingShare.save();
    } else {
      await Share.create({
        post: post._id,
        user: req.user._id,
        note: req.body.note || ''
      });
    }

    post.shareCount += 1;
    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Chia sẻ bài viết lên trang cá nhân thành công',
      data: { shareCount: post.shareCount }
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Unshare post from wall
module.exports.unsharePost = async (req, res) => {
  try {
    const share = await Share.findOne({
      post: req.params.id,
      user: req.user._id,
      deleted: false
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Bạn chưa chia sẻ bài viết này'
      });
    }

    share.deleted = true;
    await share.save();

    await Post.findByIdAndUpdate(req.params.id, {
      $inc: { shareCount: -1 }
    });

    res.json({
      success: true,
      message: 'Đã hủy chia sẻ bài viết khỏi trang cá nhân'
    });
  } catch (error) {
    console.error('Unshare post error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get user's posts (wall)
module.exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get own posts
    const ownPosts = await Post.find({
      author: userId,
      deleted: false,
      status: 'published'
    })
      .populate('author', 'fullName avatar')
      .populate('labels', 'name slug color')
      .sort({ createdAt: -1 });

    // Get shared posts
    const shares = await Share.find({
      user: userId,
      deleted: false
    })
      .populate({
        path: 'post',
        match: { deleted: false, status: 'published' },
        populate: [
          { path: 'author', select: 'fullName avatar' },
          { path: 'labels', select: 'name slug color' }
        ]
      })
      .sort({ createdAt: -1 });

    // Combine and sort
    const wallItems = [];

    ownPosts.forEach(post => {
      wallItems.push({
        type: 'own',
        post: post,
        createdAt: post.createdAt
      });
    });

    shares.forEach(share => {
      if (share.post) {
        wallItems.push({
          type: 'shared',
          post: share.post,
          note: share.note,
          sharedAt: share.createdAt,
          createdAt: share.createdAt
        });
      }
    });

    wallItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = wallItems.length;
    const paginatedItems = wallItems.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get search suggestions (text-only: matching labels & matching post titles)
module.exports.getSuggestions = async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ success: true, data: { labels: [], posts: [] } });
    }

    const regex = new RegExp(q, 'i');
    const Label = require('../models/label-model');

    const [labels, posts] = await Promise.all([
      Label.find({ name: regex, deleted: false })
        .select('name slug color')
        .limit(5),
      Post.find({ title: regex, status: 'published', deleted: false })
        .select('title slug')
        .limit(5)
    ]);

    res.json({
      success: true,
      data: {
        labels,
        posts
      }
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Upload content image to Cloudinary for Rich Text Editor
module.exports.uploadContentImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }
    const result = await uploadToCloudinary(req.file.buffer, 'blog/content');
    res.json({
      success: true,
      url: result.secure_url
    });
  } catch (error) {
    console.error('Upload content image error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải ảnh lên Cloudinary' });
  }
};
