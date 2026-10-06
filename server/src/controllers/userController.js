const User = require('../models/User');
const Listing = require('../models/Listing');

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user || !user.isActive) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    return res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'bio', 'avatar'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    return res.json({ success: true, message: 'Profile updated.', data: { user } });
  } catch (err) { next(err); }
};

const updatePushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { pushToken });
    return res.json({ success: true, message: 'Push token registered.' });
  } catch (err) { next(err); }
};

const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ ownerId: req.user._id, communityId: req.user.communityId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: { listings } });
  } catch (err) { next(err); }
};

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: { users: [] } });
    }
    const users = await User.find({
      communityId: req.user.communityId,
      _id: { $ne: req.user._id },
      isActive: true,
      name: { $regex: q.trim(), $options: 'i' },
    })
      .select('name avatar rating reviewCount')
      .limit(20);
    return res.json({ success: true, data: { users } });
  } catch (err) { next(err); }
};

module.exports = { getUser, updateMe, updatePushToken, getMyListings, searchUsers };
