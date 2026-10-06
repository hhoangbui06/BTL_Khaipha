const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label-controller');
const { requireAuth, requireRole } = require('../middlewares/auth-middleware');

// Public
router.get('/', labelController.getAll);

// Protected: Only Admin & Admin Bài Viết can create, update, delete labels
router.post('/', requireAuth, requireRole('admin', 'admin_posts'), labelController.create);
router.put('/:id', requireAuth, requireRole('admin', 'admin_posts'), labelController.update);
router.delete('/:id', requireAuth, requireRole('admin', 'admin_posts'), labelController.delete);

module.exports = router;
