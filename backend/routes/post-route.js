const express = require('express');
const router = express.Router();
const postController = require('../controllers/post-controller');
const { requireAuth, optionalAuth } = require('../middlewares/auth-middleware');
const { uploadSingle } = require('../middlewares/upload-middleware');

// Public routes (optional auth for like status)
router.get('/suggestions', postController.getSuggestions);
router.get('/', optionalAuth, postController.getAll);
router.get('/slug/:slug', optionalAuth, postController.getBySlug);
router.get('/user/:userId', optionalAuth, postController.getUserPosts);
router.get('/:id', optionalAuth, postController.getById);

// Protected routes
router.post('/upload-image', requireAuth, uploadSingle('image'), postController.uploadContentImage);
router.post('/', requireAuth, uploadSingle('thumbnail'), postController.create);
router.put('/:id', requireAuth, uploadSingle('thumbnail'), postController.update);
router.delete('/:id', requireAuth, postController.delete);
router.post('/:id/like', requireAuth, postController.toggleLike);
router.post('/:id/share', requireAuth, postController.sharePost);
router.delete('/:id/share', requireAuth, postController.unsharePost);

module.exports = router;
