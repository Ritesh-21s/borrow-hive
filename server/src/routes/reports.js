const express = require('express');
const router = express.Router();
const { createReport } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);
router.post('/', createLimiterStrict, createReport);

module.exports = router;
