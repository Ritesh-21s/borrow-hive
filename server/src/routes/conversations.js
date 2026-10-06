const express = require('express');
const router = express.Router();
const { getConversations, createConversation, getMessages, sendMessage } = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

router.use(requireAuth);
router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', messageLimiter, sendMessage);

module.exports = router;
