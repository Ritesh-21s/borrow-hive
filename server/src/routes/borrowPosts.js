const express = require('express');
const router = express.Router();
const {
  getBorrowPosts,
  createBorrowPost,
  getBorrowPost,
  fulfillBorrowPost,
  updateBorrowPost,
  deleteBorrowPost,
} = require('../controllers/borrowPostController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.get('/', getBorrowPosts);
router.post('/', createLimiterStrict, createBorrowPost);
router.get('/:id', getBorrowPost);
router.patch('/:id/fulfill', fulfillBorrowPost);
router.patch('/:id', updateBorrowPost);
router.delete('/:id', deleteBorrowPost);

module.exports = router;
