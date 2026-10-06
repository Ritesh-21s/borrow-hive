const express = require('express');
const router = express.Router();
const { getUser, updateMe, updatePushToken, getMyListings, searchUsers } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/me/listings', getMyListings);
router.get('/search', searchUsers);
router.patch('/me', updateMe);
router.post('/push-token', updatePushToken);
router.get('/:id', getUser);

module.exports = router;
