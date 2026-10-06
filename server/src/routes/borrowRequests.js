const express = require('express');
const router = express.Router();
const {
  createBorrowRequest, getMyBorrowRequests, getBorrowRequest,
  acceptBorrowRequest, rejectBorrowRequest, markReturned, cancelBorrowRequest,
} = require('../controllers/borrowController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.post('/', createLimiterStrict, createBorrowRequest);
router.get('/mine', getMyBorrowRequests);
router.get('/:id', getBorrowRequest);
router.patch('/:id/accept', acceptBorrowRequest);
router.patch('/:id/reject', rejectBorrowRequest);
router.patch('/:id/return', markReturned);
router.patch('/:id/cancel', cancelBorrowRequest);

module.exports = router;
