const express = require('express');
const router = express.Router();
const {
  getFavors,
  createFavor,
  getFavor,
  updateFavor,
  deleteFavor,
  completeFavor,
  cancelFavor,
} = require('../controllers/favorController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);
router.get('/', getFavors);
router.post('/', createLimiterStrict, createFavor);
router.get('/:id', getFavor);
router.patch('/:id', updateFavor);
router.delete('/:id', deleteFavor);
router.patch('/:id/complete', completeFavor);
router.patch('/:id/cancel', cancelFavor);

module.exports = router;
