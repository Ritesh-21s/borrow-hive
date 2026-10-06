const express = require('express');
const router = express.Router();
const {
  getListings, createListing, getListing, updateListing, deleteListing, getMyListings,
} = require('../controllers/listingController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.get('/my', getMyListings);
router.get('/', getListings);
router.post('/', createLimiterStrict, createListing);
router.get('/:id', getListing);
router.patch('/:id', updateListing);
router.delete('/:id', deleteListing);

module.exports = router;
