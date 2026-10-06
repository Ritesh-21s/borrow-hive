const express = require('express');
const router = express.Router();
const { createReview, getUserReviews, getPendingReviews, editReview } = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);
router.post('/', createLimiterStrict, createReview);
router.get('/pending', getPendingReviews);
router.get('/user/:userId', getUserReviews);
router.patch('/:id', editReview);

module.exports = router;
