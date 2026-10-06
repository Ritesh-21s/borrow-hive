const Favor = require('../models/Favor');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * GET /api/favors
 * Query ONLY open favors whose deadline has not passed, sorted newest first
 */
const getFavors = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const now = new Date();

    const filter = {
      communityId: req.user.communityId,
      status: 'open',
      $or: [
        { deadline: { $exists: false } },
        { deadline: null },
        { deadline: { $gt: now } }, // Auto-hide expired favors
      ],
    };

    if (category && category !== 'all' && category !== 'All') {
      filter.category = category.toLowerCase();
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const favors = await Favor.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('requesterId', 'name avatar rating')
      .populate('posterId', 'name avatar rating')
      .populate('helperId', 'name avatar');

    const total = await Favor.countDocuments(filter);
    return res.json({ success: true, data: { favors, total } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/favors
 * Raise a favor
 */
const createFavor = async (req, res, next) => {
  try {
    const { title, description, category, location, deadline } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });

    const favor = await Favor.create({
      title: title.trim(),
      description: description || '',
      category: category || 'other',
      location: location || '',
      deadline: deadline ? new Date(deadline) : undefined,
      requesterId: req.user._id,
      posterId: req.user._id,
      communityId: req.user.communityId,
      status: 'open',
    });

    const populated = await favor.populate('requesterId', 'name avatar rating');

    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'favor_posted',
      title: 'Favor posted',
      body: `Your favor "${title}" is now open for your community.`,
      data: { favorId: favor._id },
    });

    return res.status(201).json({ success: true, message: 'Favor posted.', data: { favor: populated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/favors/:id
 */
const getFavor = async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id)
      .populate('requesterId', 'name avatar rating communityId')
      .populate('posterId', 'name avatar rating communityId')
      .populate('helperId', 'name avatar rating');

    if (!favor) return res.status(404).json({ success: false, message: 'Favor not found.' });
    if (favor.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }

    return res.json({ success: true, data: { favor } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/favors/:id
 * Poster edits their open favor
 */
const updateFavor = async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id);
    if (!favor) return res.status(404).json({ success: false, message: 'Favor not found.' });

    const ownerIdStr = (favor.posterId || favor.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the poster can edit this favor.' });
    }

    const allowed = ['title', 'description', 'category', 'location', 'deadline'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) favor[k] = req.body[k];
    });

    await favor.save();
    return res.json({ success: true, message: 'Favor updated.', data: { favor } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/favors/:id
 * Poster deletes their open favor (soft close)
 */
const deleteFavor = async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id);
    if (!favor) return res.status(404).json({ success: false, message: 'Favor not found.' });

    const ownerIdStr = (favor.posterId || favor.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the poster can delete this favor.' });
    }

    favor.status = 'closed';
    await favor.save();
    return res.json({ success: true, message: 'Favor closed and removed from listings.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/favors/:id/complete
 * "Favor done" button: sets status to closed, removes from list, triggers review prompt
 */
const completeFavor = async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id)
      .populate('helperId', 'name avatar pushToken');

    if (!favor) return res.status(404).json({ success: false, message: 'Favor not found.' });

    const ownerIdStr = (favor.posterId || favor.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the poster can mark this favor done.' });
    }

    favor.status = 'closed';
    await favor.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.favors': 1 } });

    // If a helper was specified or assigned
    const helperId = req.body.helperId || favor.helperId?._id;
    if (helperId) {
      const helper = await User.findById(helperId);
      if (helper) {
        await sendPushNotification({
          pushToken: req.user.pushToken,
          user: req.user,
          type: 'review_received',
          title: 'Favor done! Leave a review ⭐',
          body: `How did ${helper.name} do? Rate your helper.`,
          data: { favorId: favor._id, revieweeId: helper._id, transactionType: 'favor' },
        });

        await sendPushNotification({
          pushToken: helper.pushToken,
          user: helper,
          type: 'review_received',
          title: 'Favor completed! Leave a review ⭐',
          body: `${req.user.name} marked the favor as done. Rate the requester!`,
          data: { favorId: favor._id, revieweeId: req.user._id, transactionType: 'favor' },
        });
      }
    } else {
      await sendPushNotification({
        pushToken: req.user.pushToken,
        user: req.user,
        type: 'favor_completed',
        title: 'Favor marked as done ✅',
        body: `"${favor.title}" is now completed and closed.`,
        data: { favorId: favor._id },
      });
    }

    return res.json({ success: true, message: 'Favor completed.', data: { favor } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/favors/:id/cancel
 */
const cancelFavor = async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id);
    if (!favor) return res.status(404).json({ success: false, message: 'Favor not found.' });

    const ownerIdStr = (favor.posterId || favor.requesterId).toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the requester can cancel.' });
    }

    favor.status = 'closed';
    await favor.save();
    return res.json({ success: true, message: 'Favor closed.', data: { favor } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFavors,
  createFavor,
  getFavor,
  updateFavor,
  deleteFavor,
  completeFavor,
  cancelFavor,
};
