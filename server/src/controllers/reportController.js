const Report = require('../models/Report');

const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ success: false, message: 'targetType, targetId, and reason are required.' });
    }
    const report = await Report.create({
      reporterId: req.user._id,
      communityId: req.user.communityId,
      targetType, targetId, reason, details: details || '',
    });
    return res.status(201).json({ success: true, message: 'Report submitted. We will review it shortly.', data: { report } });
  } catch (err) { next(err); }
};

module.exports = { createReport };
