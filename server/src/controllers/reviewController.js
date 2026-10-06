const Review = require('../models/Review');
const User = require('../models/User');
const BorrowRequest = require('../models/BorrowRequest');
const RideRequest = require('../models/RideRequest');
const Ride = require('../models/Ride');
const Favor = require('../models/Favor');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * Verify the reviewer actually completed a transaction with reviewee
 */
const verifyTransactionEligibility = async (reviewerId, revieweeId, transactionType, transactionId) => {
  switch (transactionType) {
    case 'borrow': {
      const br = await BorrowRequest.findById(transactionId);
      if (!br || br.status !== 'RETURNED') return false;
      const involved = [br.borrowerId.toString(), br.ownerId.toString()];
      return involved.includes(reviewerId.toString()) && involved.includes(revieweeId.toString());
    }
    case 'sale': {
      // For sales, listing status = 'sold'; we don't track the exact buyer so we allow
      // any review where both parties were involved in the same listing
      // transactionId here is the listingId
      const Listing = require('../models/Listing');
      const listing = await Listing.findById(transactionId);
      if (!listing || listing.status !== 'sold') return false;
      const ownerId = listing.ownerId.toString();
      // Reviewer must be owner or a buyer (we check reviewer != reviewee and one is the owner)
      return (reviewerId.toString() === ownerId || revieweeId.toString() === ownerId);
    }
    case 'ride': {
      const rr = await RideRequest.findById(transactionId).populate('rideId');
      if (!rr || rr.status !== 'ACCEPTED') return false;
      const involved = [rr.requesterId.toString(), rr.rideId.driverId.toString()];
      return involved.includes(reviewerId.toString()) && involved.includes(revieweeId.toString());
    }
    case 'favor': {
      const fv = await Favor.findById(transactionId);
      if (!fv || fv.status !== 'completed') return false;
      const involved = [fv.requesterId.toString(), fv.helperId?.toString()].filter(Boolean);
      return involved.includes(reviewerId.toString()) && involved.includes(revieweeId.toString());
    }
    default:
      return false;
  }
};

/**
 * POST /api/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { revieweeId, rating, comment, transactionType, transactionId, tags } = req.body;
    if (!revieweeId || !rating || !transactionType || !transactionId) {
      return res.status(400).json({ success: false, message: 'revieweeId, rating, transactionType, transactionId are required.' });
    }
    if (revieweeId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself.' });
    }

    const eligible = await verifyTransactionEligibility(
      req.user._id, revieweeId, transactionType, transactionId
    );
    if (!eligible) {
      return res.status(403).json({
        success: false,
        message: 'You can only review users after completing a transaction with them.',
      });
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      revieweeId,
      communityId: req.user.communityId,
      rating,
      comment: comment || '',
      tags: tags || [],
      transactionType,
      transactionId,
    });

    // Update reviewee's average rating
    const allReviews = await Review.find({ revieweeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    });

    // Notify reviewee that they received a review
    const reviewee = await User.findById(revieweeId);
    if (reviewee) {
      await sendPushNotification({
        pushToken: reviewee.pushToken,
        user: reviewee,
        type: 'review_received',
        title: 'New review received! ⭐',
        body: `${req.user.name} left you a ${rating}-star review.`,
        data: { reviewId: review._id, reviewerId: req.user._id },
      });
    }

    return res.status(201).json({ success: true, message: 'Review submitted.', data: { review } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this transaction.' });
    }
    next(err);
  }
};

/**
 * GET /api/reviews/user/:userId
 */
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      revieweeId: req.params.userId,
      communityId: req.user.communityId,
    })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'name avatar');
    return res.json({ success: true, data: { reviews } });
  } catch (err) { next(err); }
};

/**
 * GET /api/reviews/pending
 * Returns transactions the current user has completed but not yet reviewed.
 */
const getPendingReviews = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pending = [];

    // Completed borrow requests (as owner or borrower)
    const borrows = await BorrowRequest.find({
      status: 'RETURNED',
      $or: [{ borrowerId: userId }, { ownerId: userId }],
    }).populate('listingId', 'title').populate('borrowerId', 'name avatar').populate('ownerId', 'name avatar');

    for (const br of borrows) {
      const otherUser = br.borrowerId._id.toString() === userId.toString() ? br.ownerId : br.borrowerId;
      const alreadyReviewed = await Review.findOne({ reviewerId: userId, transactionId: br._id });
      if (!alreadyReviewed) {
        pending.push({
          type: 'borrow',
          transactionId: br._id,
          revieweeId: otherUser._id,
          revieweeName: otherUser.name,
          revieweeAvatar: otherUser.avatar,
          context: `Borrow: ${br.listingId?.title || 'item'}`,
        });
      }
    }

    // Completed rides (as driver or passenger)
    const completedRides = await Ride.find({ status: 'completed', driverId: userId });
    for (const ride of completedRides) {
      const acceptedPassengers = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
        .populate('requesterId', 'name avatar');
      for (const rr of acceptedPassengers) {
        const alreadyReviewed = await Review.findOne({ reviewerId: userId, transactionId: rr._id });
        if (!alreadyReviewed) {
          pending.push({
            type: 'ride',
            transactionId: rr._id,
            revieweeId: rr.requesterId._id,
            revieweeName: rr.requesterId.name,
            revieweeAvatar: rr.requesterId.avatar,
            context: `Ride: ${ride.from} → ${ride.to}`,
          });
        }
      }
    }

    // Completed rides as passenger
    const myRideRequests = await RideRequest.find({ requesterId: userId, status: 'ACCEPTED' })
      .populate({ path: 'rideId', match: { status: 'completed' }, populate: { path: 'driverId', select: 'name avatar' } });
    for (const rr of myRideRequests) {
      if (!rr.rideId) continue; // ride not completed yet
      const alreadyReviewed = await Review.findOne({ reviewerId: userId, transactionId: rr._id });
      if (!alreadyReviewed) {
        pending.push({
          type: 'ride',
          transactionId: rr._id,
          revieweeId: rr.rideId.driverId._id,
          revieweeName: rr.rideId.driverId.name,
          revieweeAvatar: rr.rideId.driverId.avatar,
          context: `Ride: ${rr.rideId.from} → ${rr.rideId.to}`,
        });
      }
    }

    // Completed favors
    const favors = await Favor.find({
      status: 'completed',
      $or: [{ requesterId: userId }, { helperId: userId }],
    }).populate('requesterId', 'name avatar').populate('helperId', 'name avatar');

    for (const fv of favors) {
      if (!fv.helperId) continue;
      const otherUser = fv.requesterId._id.toString() === userId.toString() ? fv.helperId : fv.requesterId;
      const alreadyReviewed = await Review.findOne({ reviewerId: userId, transactionId: fv._id });
      if (!alreadyReviewed) {
        pending.push({
          type: 'favor',
          transactionId: fv._id,
          revieweeId: otherUser._id,
          revieweeName: otherUser.name,
          revieweeAvatar: otherUser.avatar,
          context: `Favor: ${fv.title}`,
        });
      }
    }

    return res.json({ success: true, data: { pending } });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/reviews/:id
 * Edit own review within 24 hours of creation.
 */
const editReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.reviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own reviews.' });
    }

    const ageMs = Date.now() - new Date(review.createdAt).getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (ageMs > TWENTY_FOUR_HOURS) {
      return res.status(403).json({ success: false, message: 'Reviews can only be edited within 24 hours of submission.' });
    }

    const { rating, comment, tags } = req.body;
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    if (tags !== undefined) review.tags = tags;
    await review.save();

    // Recalculate reviewee's average rating
    const allReviews = await Review.find({ revieweeId: review.revieweeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(review.revieweeId, {
      rating: Math.round(avgRating * 10) / 10,
    });

    return res.json({ success: true, message: 'Review updated.', data: { review } });
  } catch (err) { next(err); }
};

module.exports = { createReview, getUserReviews, getPendingReviews, editReview };
