const BorrowRequest = require('../models/BorrowRequest');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * POST /api/borrow-requests
 * Creates request and validates no overlapping ACCEPTED/BORROWED window
 */
const createBorrowRequest = async (req, res, next) => {
  try {
    const { listingId, startTime, endTime, note } = req.body;
    if (!listingId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'listingId, startTime, and endTime are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start time must be before end time.' });
    }
    if (start < new Date()) {
      return res.status(400).json({ success: false, message: 'Start time cannot be in the past.' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found.' });
    if (listing.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    if (listing.type === 'sale') {
      return res.status(400).json({ success: false, message: 'This listing is for sale only.' });
    }
    if (listing.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot borrow your own listing.' });
    }

    // Overlap check: existing.startTime < end AND existing.endTime > start
    const conflict = await BorrowRequest.findOne({
      listingId,
      status: { $in: ['ACCEPTED', 'BORROWED'] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'This item is already booked for the selected time window.',
      });
    }

    const borrowRequest = await BorrowRequest.create({
      listingId,
      borrowerId: req.user._id,
      ownerId: listing.ownerId,
      communityId: req.user.communityId,
      startTime: start,
      endTime: end,
      note: note || '',
    });

    // Notify owner
    const owner = await User.findById(listing.ownerId);
    if (owner) {
      await sendPushNotification({
        pushToken: owner.pushToken,
        user: owner,
        type: 'borrow_request_received',
        title: 'New borrow request',
        body: `${req.user.name} wants to borrow your ${listing.title}`,
        data: { borrowRequestId: borrowRequest._id, listingId },
      });
    }

    // Confirmation notification for borrower
    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'borrow_request_sent',
      title: 'Borrow request placed',
      body: `Your request to borrow "${listing.title}" has been placed successfully.`,
      data: { borrowRequestId: borrowRequest._id, listingId },
    });

    return res.status(201).json({ success: true, message: 'Borrow request created.', data: { borrowRequest } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/borrow-requests/mine
 */
const getMyBorrowRequests = async (req, res, next) => {
  try {
    const { role = 'borrower' } = req.query; // 'borrower' or 'owner'
    const filter = {
      communityId: req.user.communityId,
      [role === 'owner' ? 'ownerId' : 'borrowerId']: req.user._id,
    };

    const requests = await BorrowRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('listingId', 'title images')
      .populate('borrowerId', 'name avatar')
      .populate('ownerId', 'name avatar');

    return res.json({ success: true, data: { requests } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/borrow-requests/:id
 */
const getBorrowRequest = async (req, res, next) => {
  try {
    const br = await BorrowRequest.findById(req.params.id)
      .populate('listingId', 'title images type')
      .populate('borrowerId', 'name avatar rating')
      .populate('ownerId', 'name avatar rating');
    if (!br) return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    if (br.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    if (![br.borrowerId._id.toString(), br.ownerId._id.toString()].includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    return res.json({ success: true, data: { borrowRequest: br } });
  } catch (err) {
    next(err);
  }
};

const _guardOwner = async (req, res) => {
  const br = await BorrowRequest.findById(req.params.id);
  if (!br) { res.status(404).json({ success: false, message: 'Request not found.' }); return null; }
  if (br.communityId.toString() !== req.user.communityId.toString()) {
    res.status(403).json({ success: false, message: 'Cross-community access denied.' }); return null;
  }
  if (br.ownerId.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: 'Only the item owner can perform this action.' }); return null;
  }
  return br;
};

/**
 * PATCH /api/borrow-requests/:id/accept
 */
const acceptBorrowRequest = async (req, res, next) => {
  try {
    const br = await _guardOwner(req, res);
    if (!br) return;
    if (br.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be accepted.' });
    }

    // Re-check overlap before accepting
    const conflict = await BorrowRequest.findOne({
      _id: { $ne: br._id },
      listingId: br.listingId,
      status: { $in: ['ACCEPTED', 'BORROWED'] },
      startTime: { $lt: br.endTime },
      endTime: { $gt: br.startTime },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Another request for this window was already accepted.' });
    }

    br.status = 'ACCEPTED';
    await br.save();

    const borrower = await User.findById(br.borrowerId);
    const listing = await Listing.findById(br.listingId);
    if (borrower && listing) {
      await sendPushNotification({
        pushToken: borrower.pushToken,
        user: borrower,
        type: 'borrow_accepted',
        title: 'Borrow request accepted!',
        body: `Your request to borrow ${listing.title} was accepted.`,
        data: { borrowRequestId: br._id },
      });
    }

    return res.json({ success: true, message: 'Borrow request accepted.', data: { borrowRequest: br } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/borrow-requests/:id/reject
 */
const rejectBorrowRequest = async (req, res, next) => {
  try {
    const br = await _guardOwner(req, res);
    if (!br) return;
    if (!['PENDING', 'ACCEPTED'].includes(br.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reject at this stage.' });
    }
    br.status = 'REJECTED';
    await br.save();

    const borrower = await User.findById(br.borrowerId);
    const listing = await Listing.findById(br.listingId);
    if (borrower && listing) {
      await sendPushNotification({
        pushToken: borrower.pushToken,
        user: borrower,
        type: 'borrow_rejected',
        title: 'Borrow request rejected',
        body: `Your request to borrow ${listing.title} was not accepted.`,
        data: { borrowRequestId: br._id },
      });
    }

    return res.json({ success: true, message: 'Borrow request rejected.', data: { borrowRequest: br } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/borrow-requests/:id/return
 * Owner marks item as returned
 */
const markReturned = async (req, res, next) => {
  try {
    const br = await _guardOwner(req, res);
    if (!br) return;
    if (br.status !== 'BORROWED' && br.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Item is not currently borrowed.' });
    }
    br.status = 'RETURNED';
    await br.save();

    // Update borrower stats
    await User.findByIdAndUpdate(br.borrowerId, { $inc: { 'stats.borrowed': 1 } });

    const listing = await Listing.findById(br.listingId);
    const borrower = await User.findById(br.borrowerId);

    // Prompt borrower to review the owner
    if (borrower) {
      await sendPushNotification({
        pushToken: borrower.pushToken,
        user: borrower,
        type: 'review_received',
        title: 'How was it? Leave a review ⭐',
        body: `Leave a review for the owner of "${listing?.title || 'the item'}" you returned.`,
        data: { borrowRequestId: br._id, revieweeId: br.ownerId, transactionType: 'borrow' },
      });
    }

    // Prompt owner to review the borrower
    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'review_received',
      title: 'Item returned! Leave a review ⭐',
      body: `${borrower?.name || 'The borrower'} returned "${listing?.title || 'your item'}". Leave them a review!`,
      data: { borrowRequestId: br._id, revieweeId: br.borrowerId, transactionType: 'borrow' },
    });

    return res.json({ success: true, message: 'Item marked as returned.', data: { borrowRequest: br } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/borrow-requests/:id/cancel
 * Borrower can cancel their own pending request
 */
const cancelBorrowRequest = async (req, res, next) => {
  try {
    const br = await BorrowRequest.findById(req.params.id);
    if (!br) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (br.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    if (br.borrowerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the borrower can cancel their request.' });
    }
    if (!['PENDING', 'ACCEPTED'].includes(br.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel at this stage.' });
    }
    br.status = 'CANCELLED';
    await br.save();
    return res.json({ success: true, message: 'Borrow request cancelled.', data: { borrowRequest: br } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBorrowRequest,
  getMyBorrowRequests,
  getBorrowRequest,
  acceptBorrowRequest,
  rejectBorrowRequest,
  markReturned,
  cancelBorrowRequest,
};
