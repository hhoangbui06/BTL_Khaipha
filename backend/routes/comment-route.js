const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment-controller');
const { requireAuth, optionalAuth } = require('../middlewares/auth-middleware');

// Public
router.get('/post/:postId', optionalAuth, commentController.getByPost);

// Protected
router.post('/', requireAuth, commentController.create);
router.put('/:id', requireAuth, commentController.update);
router.delete('/:id', requireAuth, commentController.delete);
router.post('/:id/like', requireAuth, commentController.toggleLike);

module.exports = router;
