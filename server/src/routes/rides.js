const express = require('express');
const router = express.Router();
const {
  getRides,
  createRide,
  getRide,
  updateRide,
  deleteRide,
  requestSeat,
  getRideRequests,
  acceptRideRequest,
  rejectRideRequest,
  completeRide,
  startRide,
  updateRideLocation,
  cancelRideBooking,
} = require('../controllers/rideController');
const { requireAuth } = require('../middleware/auth');
const { createLimiterStrict } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.get('/', getRides);
router.post('/', createLimiterStrict, createRide);
router.get('/:id', getRide);
router.patch('/:id', updateRide);
router.delete('/:id', deleteRide);
router.patch('/:id/close', deleteRide);
router.patch('/:id/location', updateRideLocation);
router.patch('/:id/cancel-booking', cancelRideBooking);
router.post('/:id/request-seat', createLimiterStrict, requestSeat);
router.get('/:id/requests', getRideRequests);
router.patch('/:id/requests/:requestId/accept', acceptRideRequest);
router.patch('/:id/requests/:requestId/reject', rejectRideRequest);
router.patch('/:id/complete', completeRide);
router.patch('/:id/start', startRide);

module.exports = router;
