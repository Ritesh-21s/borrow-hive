const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', getNotifications);
router.patch('/read-all', markAllRead);

module.exports = router;
