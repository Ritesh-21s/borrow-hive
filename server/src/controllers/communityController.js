const Community = require('../models/Community');

/**
 * GET /api/communities/check-domain?domain=kpriet.ac.in
 */
const checkDomain = async (req, res, next) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain is required.' });
    }
    const community = await Community.findOne({ emailDomain: domain.toLowerCase(), isActive: true });
    return res.json({
      success: true,
      data: { matched: !!community, community: community || null },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/verify-invite
 */
const verifyInvite = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required.' });
    }
    const community = await Community.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true });
    if (!community) {
      return res.status(404).json({ success: false, message: 'Invalid invite code.' });
    }
    return res.json({ success: true, data: { community } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/:id
 */
const getCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found.' });
    }
    // Only same-community members can view
    if (req.user.communityId.toString() !== community._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    return res.json({ success: true, data: { community } });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkDomain, verifyInvite, getCommunity };
