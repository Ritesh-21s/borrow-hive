const express = require('express');
const router = express.Router();
const { checkDomain, verifyInvite, getCommunity } = require('../controllers/communityController');
const { requireAuth } = require('../middleware/auth');

router.get('/check-domain', checkDomain);
router.post('/verify-invite', verifyInvite);
router.get('/:id', requireAuth, getCommunity);

module.exports = router;
