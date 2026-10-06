const BorrowPost = require('../models/BorrowPost');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * GET /api/borrow-posts
 * Query ONLY open listings whose neededUntil has not passed
 */
const getBorrowPosts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const now = new Date();

    const filter = {
      communityId: req.user.communityId,
      status: 'open',
      neededUntil: { $gt: now }, // Auto-hide listings whose deadline has passed
    };

    if (category && category.toLowerCase() !== 'all') {
      filter.category = category.toLowerCase();
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const posts = await BorrowPost.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('requesterId', 'name avatar rating reviewCount');

    const total = await BorrowPost.countDocuments(filter);

    return res.json({
      success: true,
      data: { posts, total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/borrow-posts
 * Raise a borrow request
 */
const createBorrowPost = async (req, res, next) => {
  try {
    const { title, category, imageUrl, neededFrom, neededUntil, notes } = req.body;
    if (!title || !neededFrom || !neededUntil) {
      return res.status(400).json({ success: false, message: 'Item name, neededFrom, and neededUntil are required.' });
    }

    const post = await BorrowPost.create({
      title,
      category: category || 'other',
      imageUrl: imageUrl || '',
      neededFrom: new Date(neededFrom),
      neededUntil: new Date(neededUntil),
      notes: notes || '',
      status: 'open',
      requesterId: req.user._id,
      communityId: req.user.communityId,
    });

    const populated = await post.populate('requesterId', 'name avatar rating');

    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'borrow_request_sent',
      title: 'Borrow request posted',
      body: `Your request for "${title}" is now open for your community to help.`,
      data: { borrowPostId: post._id },
    });

    return res.status(201).json({ success: true, message: 'Borrow request raised.', data: { post: populated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/borrow-posts/:id
 */
const getBorrowPost = async (req, res, next) => {
  try {
    const post = await BorrowPost.findById(req.params.id)
      .populate('requesterId', 'name avatar rating reviewCount communityId');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }
    if (post.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    return res.json({ success: true, data: { post } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/borrow-posts/:id/fulfill
 * Requester marks borrow request as fulfilled -> sets status to closed
 */
const fulfillBorrowPost = async (req, res, next) => {
  try {
    const post = await BorrowPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }
    if (post.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the requester can mark this fulfilled.' });
    }

    post.status = 'closed';
    await post.save();

    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'borrow_request_received',
      title: 'Borrow request fulfilled ✅',
      body: `"${post.title}" has been marked as fulfilled and closed.`,
      data: { borrowPostId: post._id },
    });

    return res.json({ success: true, message: 'Borrow request fulfilled and closed.', data: { post } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/borrow-posts/:id
 * Requester edits open borrow request
 */
const updateBorrowPost = async (req, res, next) => {
  try {
    const post = await BorrowPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }
    if (post.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the requester can edit this.' });
    }

    const allowed = ['title', 'category', 'imageUrl', 'neededFrom', 'neededUntil', 'notes'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) post[k] = req.body[k];
    });

    await post.save();
    return res.json({ success: true, message: 'Borrow request updated.', data: { post } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/borrow-posts/:id
 * Requester deletes/closes open borrow request
 */
const deleteBorrowPost = async (req, res, next) => {
  try {
    const post = await BorrowPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }
    if (post.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the requester can delete this.' });
    }

    post.status = 'closed';
    await post.save();
    return res.json({ success: true, message: 'Borrow request closed and removed from listings.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBorrowPosts,
  createBorrowPost,
  getBorrowPost,
  fulfillBorrowPost,
  updateBorrowPost,
  deleteBorrowPost,
};
