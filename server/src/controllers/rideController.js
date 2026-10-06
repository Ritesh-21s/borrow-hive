const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * GET /api/rides
 * Community-scoped, returns only OPEN rides whose departureTime has not passed
 */
const getRides = async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const communityId = req.user.communityId;
    const now = new Date();

    const filter = {
      communityId,
      status: { $in: ['open', 'active', 'full'] },
      departureTime: { $gt: now }, // Auto-hide rides whose time has passed
    };

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
      ];
    }

    const rides = await Ride.find(filter)
      .sort({ departureTime: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('driverId', 'name avatar rating reviewCount')
      .populate('ownerId', 'name avatar rating reviewCount')
      .populate('requesterId', 'name avatar rating reviewCount')
      .lean();

    const rideIds = rides.map((r) => r._id);
    const acceptedRequests = await RideRequest.find({
      rideId: { $in: rideIds },
      status: 'ACCEPTED',
    }).populate('requesterId', 'name avatar').lean();

    const passengersByRide = {};
    acceptedRequests.forEach((r) => {
      const id = r.rideId.toString();
      if (!passengersByRide[id]) passengersByRide[id] = [];
      passengersByRide[id].push({
        seats: r.seatsRequested,
        user: r.requesterId,
      });
    });

    const ridesWithPassengers = rides.map((r) => {
      const isOwner = [r.driverId?._id?.toString(), r.ownerId?._id?.toString(), r.requesterId?._id?.toString()]
        .includes(req.user._id.toString());
      const isPassenger = (passengersByRide[r._id.toString()] || [])
        .some((p) => p.user?._id?.toString() === req.user._id.toString());

      return {
        ...r,
        seatsLeft: r.seatsLeft !== undefined ? r.seatsLeft : r.availableSeats,
        passengers: passengersByRide[r._id.toString()] || [],
        // Live location is text only, visible ONLY to driver/owner and accepted passengers
        currentLocationText: isOwner || isPassenger ? r.currentLocationText : '',
        locationUpdatedAt: isOwner || isPassenger ? r.locationUpdatedAt : null,
      };
    });

    const total = await Ride.countDocuments(filter);
    return res.json({ success: true, data: { rides: ridesWithPassengers, total } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rides
 * Offer a Ride or Request a Ride
 */
const createRide = async (req, res, next) => {
  try {
    const {
      type = 'offer',
      from,
      to,
      departureTime,
      startTime,
      time,
      totalSeats,
      pricePerSeat,
      cost,
      notes,
    } = req.body;

    const rideTime = departureTime || startTime || time;

    if (!from || !to || !rideTime) {
      return res.status(400).json({ success: false, message: 'From, To, and Time are required.' });
    }
    if (new Date(rideTime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Time must be in the future.' });
    }

    let ridePayload = {
      type,
      from: from.trim(),
      to: to.trim(),
      departureTime: new Date(rideTime),
      startTime: new Date(rideTime),
      notes: notes || '',
      communityId: req.user.communityId,
      ownerId: req.user._id,
      status: 'open',
    };

    if (type === 'request') {
      ridePayload.requesterId = req.user._id;
      ridePayload.totalSeats = 1;
      ridePayload.availableSeats = 0;
      ridePayload.seatsLeft = 0;
    } else {
      // Offer a ride
      const seats = parseInt(totalSeats, 10) || 1;
      if (seats < 1) {
        return res.status(400).json({ success: false, message: 'totalSeats must be at least 1.' });
      }
      ridePayload.driverId = req.user._id;
      ridePayload.totalSeats = seats;
      ridePayload.availableSeats = seats;
      ridePayload.seatsLeft = seats;
      ridePayload.pricePerSeat = parseFloat(cost || pricePerSeat) || 0;
      ridePayload.cost = parseFloat(cost || pricePerSeat) || 0;
    }

    const ride = await Ride.create(ridePayload);
    const populated = await ride.populate('ownerId driverId requesterId', 'name avatar rating');

    const typeBadge = type === 'request' ? 'Ride request' : 'Ride offer';
    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'ride_published',
      title: `${typeBadge} published`,
      body: `Your ${typeBadge.toLowerCase()} from ${from} to ${to} is now open in your community.`,
      data: { rideId: ride._id },
    });

    return res.status(201).json({ success: true, message: 'Ride published.', data: { ride: populated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/:id
 */
const getRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driverId', 'name avatar rating reviewCount')
      .populate('ownerId', 'name avatar rating reviewCount')
      .populate('requesterId', 'name avatar rating reviewCount');

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (ride.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }

    const acceptedRequests = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
      .populate('requesterId', 'name avatar rating');

    const passengers = acceptedRequests.map((r) => ({
      requestId: r._id,
      seats: r.seatsRequested,
      user: r.requesterId,
    }));

    const isOwner = [ride.driverId?._id?.toString(), ride.ownerId?._id?.toString(), ride.requesterId?._id?.toString()]
      .includes(req.user._id.toString());
    const isPassenger = passengers.some((p) => p.user?._id?.toString() === req.user._id.toString());

    const rideObj = ride.toObject();
    rideObj.seatsLeft = rideObj.seatsLeft !== undefined ? rideObj.seatsLeft : rideObj.availableSeats;

    // Mask live location text for non-participants
    if (!isOwner && !isPassenger) {
      rideObj.currentLocationText = '';
      rideObj.locationUpdatedAt = null;
    }

    return res.json({ success: true, data: { ride: rideObj, passengers } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id
 */
const updateRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (ride.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }

    const ownerIdStr = (ride.driverId || ride.ownerId || ride.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the creator can edit this ride.' });
    }

    const allowed = ['from', 'to', 'departureTime', 'startTime', 'totalSeats', 'pricePerSeat', 'cost', 'notes', 'status'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) ride[key] = req.body[key];
    });

    if (req.body.totalSeats) {
      ride.availableSeats = req.body.totalSeats;
      ride.seatsLeft = req.body.totalSeats;
    }

    await ride.save();
    return res.json({ success: true, message: 'Ride updated.', data: { ride } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/location
 * Driver updates live location text (text only, no map, max 1 update every 30s)
 */
const updateRideLocation = async (req, res, next) => {
  try {
    const { currentLocationText } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can share live location.' });
    }

    ride.currentLocationText = currentLocationText || '';
    ride.locationUpdatedAt = new Date();
    await ride.save();

    return res.json({
      success: true,
      message: 'Location updated.',
      data: {
        currentLocationText: ride.currentLocationText,
        locationUpdatedAt: ride.locationUpdatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/rides/:id or PATCH /api/rides/:id/close
 * Close ride (soft close)
 */
const deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (ride.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }

    const ownerIdStr = (ride.driverId || ride.ownerId || ride.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the creator can close this ride.' });
    }

    ride.status = 'closed';
    ride.currentLocationText = ''; // Stop location sharing
    await ride.save();

    // Notify any pending or accepted riders
    const affectedRequests = await RideRequest.find({
      rideId: ride._id,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    }).populate('requesterId', 'pushToken');

    for (const rr of affectedRequests) {
      if (rr.requesterId) {
        await sendPushNotification({
          pushToken: rr.requesterId.pushToken,
          user: rr.requesterId,
          type: 'ride_rejected',
          title: 'Ride closed',
          body: `The ride from ${ride.from} to ${ride.to} has been closed by the creator.`,
          data: { rideId: ride._id },
        });
      }
    }

    return res.json({ success: true, message: 'Ride closed and removed from listings.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/start
 * Driver marks ride as started
 */
const startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can start this ride.' });
    }

    ride.status = 'started';
    await ride.save();

    const accepted = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
      .populate('requesterId', 'name pushToken');

    for (const rr of accepted) {
      if (rr.requesterId) {
        await sendPushNotification({
          pushToken: rr.requesterId.pushToken,
          user: rr.requesterId,
          type: 'ride_accepted',
          title: 'Your ride has started! 🚗',
          body: `${req.user.name}'s ride from ${ride.from} to ${ride.to} is now underway.`,
          data: { rideId: ride._id },
        });
      }
    }

    return res.json({ success: true, message: 'Ride marked as started.', data: { ride } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/complete
 * Driver marks ride as completed -> stops location sharing -> triggers review prompt
 */
const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can complete the ride.' });
    }

    ride.status = 'completed';
    ride.currentLocationText = ''; // Stop location sharing automatically
    await ride.save();

    const acceptedRequests = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
      .populate('requesterId', 'name avatar pushToken');

    for (const rr of acceptedRequests) {
      const passenger = rr.requesterId;
      if (!passenger) continue;

      // Prompt passenger to review driver
      await sendPushNotification({
        pushToken: passenger.pushToken,
        user: passenger,
        type: 'review_received',
        title: 'How was your ride? ⭐',
        body: `Leave a review for ${req.user.name} for your ride from ${ride.from} to ${ride.to}.`,
        data: { rideId: ride._id, rideRequestId: rr._id, revieweeId: ride.driverId, transactionType: 'ride' },
      });
    }

    // Prompt driver to review passengers
    if (acceptedRequests.length > 0) {
      await sendPushNotification({
        pushToken: req.user.pushToken,
        user: req.user,
        type: 'review_received',
        title: 'Ride completed! Leave reviews ⭐',
        body: `Rate your ${acceptedRequests.length} passenger(s) from your ride to ${ride.to}.`,
        data: { rideId: ride._id, transactionType: 'ride' },
      });
    }

    return res.json({ success: true, message: 'Ride completed.', data: { ride } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rides/:id/request-seat
 * Rider requests to join an offered ride
 */
const requestSeat = async (req, res, next) => {
  try {
    const { seatsRequested = 1 } = req.body;
    const seats = parseInt(seatsRequested, 10) || 1;

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (ride.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request to join your own ride.' });
    }
    if (ride.departureTime <= new Date()) {
      return res.status(400).json({ success: false, message: 'This ride has already departed.' });
    }

    const currentSeatsLeft = ride.seatsLeft !== undefined ? ride.seatsLeft : ride.availableSeats;
    if (currentSeatsLeft < seats) {
      return res.status(409).json({ success: false, message: 'This ride does not have enough seats left.' });
    }

    // Prevent joining twice
    const existing = await RideRequest.findOne({
      rideId: ride._id,
      requesterId: req.user._id,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.status === 'ACCEPTED'
          ? 'You are already confirmed on this ride.'
          : 'You already requested to join this ride. Please wait for the driver to accept.',
      });
    }

    const rideRequest = await RideRequest.create({
      rideId: ride._id,
      requesterId: req.user._id,
      communityId: req.user.communityId,
      seatsRequested: seats,
      status: 'PENDING',
    });

    // Notify driver
    const driver = await User.findById(ride.driverId || ride.ownerId);
    if (driver) {
      await sendPushNotification({
        pushToken: driver.pushToken,
        user: driver,
        type: 'ride_request_received',
        title: 'New ride join request!',
        body: `${req.user.name} requested to join your ride to ${ride.to}.`,
        data: { rideId: ride._id, rideRequestId: rideRequest._id },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Join request sent to the driver for approval.',
      data: { rideRequest },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/requests/:requestId/accept
 * Driver accepts rider -> reduces seatsLeft by 1, notifies rider, and opens chat
 */
const acceptRideRequest = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can accept join requests.' });
    }

    const rideRequest = await RideRequest.findById(req.params.requestId);
    if (!rideRequest || rideRequest.rideId.toString() !== ride._id.toString()) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }
    if (rideRequest.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request is already ${rideRequest.status.toLowerCase()}.` });
    }

    const seatsToDeduct = rideRequest.seatsRequested || 1;
    const currentSeats = ride.seatsLeft !== undefined ? ride.seatsLeft : ride.availableSeats;
    if (currentSeats < seatsToDeduct) {
      return res.status(409).json({ success: false, message: 'Not enough seats left to accept this request.' });
    }

    ride.seatsLeft = currentSeats - seatsToDeduct;
    ride.availableSeats = ride.seatsLeft;
    if (ride.seatsLeft === 0) {
      ride.status = 'full';
    }
    await ride.save();

    rideRequest.status = 'ACCEPTED';
    await rideRequest.save();

    // Auto-create / link conversation between driver and rider
    let convo = await Conversation.findOne({
      participants: { $all: [req.user._id, rideRequest.requesterId] },
      communityId: req.user.communityId,
    });
    if (!convo) {
      convo = await Conversation.create({
        participants: [req.user._id, rideRequest.requesterId],
        communityId: req.user.communityId,
        contextType: 'ride',
        contextId: ride._id,
      });
    }

    const requester = await User.findById(rideRequest.requesterId);
    if (requester) {
      await sendPushNotification({
        pushToken: requester.pushToken,
        user: requester,
        type: 'ride_accepted',
        title: 'Ride request accepted! 🚗',
        body: `${req.user.name} accepted your request to join the ride to ${ride.to}.`,
        data: { rideId: ride._id, conversationId: convo._id },
      });
    }

    return res.json({
      success: true,
      message: 'Request accepted. Rider added to ride.',
      data: { rideRequest, ride, conversationId: convo._id },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/requests/:requestId/reject
 * Driver declines join request -> notifies rider
 */
const rejectRideRequest = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can decline requests.' });
    }

    const rideRequest = await RideRequest.findById(req.params.requestId);
    if (!rideRequest || rideRequest.rideId.toString() !== ride._id.toString()) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }
    if (rideRequest.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request is already ${rideRequest.status.toLowerCase()}.` });
    }

    rideRequest.status = 'REJECTED';
    await rideRequest.save();

    const requester = await User.findById(rideRequest.requesterId);
    if (requester) {
      await sendPushNotification({
        pushToken: requester.pushToken,
        user: requester,
        type: 'ride_rejected',
        title: 'Ride request declined',
        body: `Your request to join the ride to ${ride.to} was not accepted.`,
        data: { rideId: ride._id },
      });
    }

    return res.json({ success: true, message: 'Request declined.', data: { rideRequest } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rides/:id/cancel-booking
 * Rider cancels booking -> restores seat(s) back to seatsLeft
 */
const cancelRideBooking = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const rideRequest = await RideRequest.findOne({
      rideId: ride._id,
      requesterId: req.user._id,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });

    if (!rideRequest) {
      return res.status(404).json({ success: false, message: 'No active booking found for this ride.' });
    }

    const wasAccepted = rideRequest.status === 'ACCEPTED';
    const seatsToRestore = rideRequest.seatsRequested || 1;

    rideRequest.status = 'CANCELLED';
    await rideRequest.save();

    if (wasAccepted) {
      const currentSeats = ride.seatsLeft !== undefined ? ride.seatsLeft : ride.availableSeats;
      ride.seatsLeft = Math.min(ride.totalSeats, currentSeats + seatsToRestore);
      ride.availableSeats = ride.seatsLeft;
      if (ride.status === 'full' && ride.seatsLeft > 0) {
        ride.status = 'open';
      }
      await ride.save();

      const driver = await User.findById(ride.driverId || ride.ownerId);
      if (driver) {
        await sendPushNotification({
          pushToken: driver.pushToken,
          user: driver,
          type: 'ride_cancelled',
          title: 'Passenger cancelled booking',
          body: `${req.user.name} cancelled their seat on your ride to ${ride.to}. 1 seat restored.`,
          data: { rideId: ride._id },
        });
      }
    }

    return res.json({ success: true, message: 'Booking cancelled.', data: { ride } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/:id/requests
 */
const getRideRequests = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

    const ownerIdStr = (ride.driverId || ride.ownerId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the driver can view join requests.' });
    }

    const requests = await RideRequest.find({ rideId: ride._id })
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name avatar rating');

    return res.json({ success: true, data: { requests } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRides,
  createRide,
  getRide,
  updateRide,
  deleteRide,
  startRide,
  completeRide,
  updateRideLocation,
  requestSeat,
  acceptRideRequest,
  rejectRideRequest,
  cancelRideBooking,
  getRideRequests,
};
