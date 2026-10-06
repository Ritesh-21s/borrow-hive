const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware: requires valid JWT, attaches req.user
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Middleware: requires admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

/**
 * Helper: check that a resource belongs to the same community as req.user
 */
const assertSameCommunity = (req, communityId) => {
  if (req.user.communityId.toString() !== communityId.toString()) {
    return false;
  }
  return true;
};

module.exports = { requireAuth, requireAdmin, assertSameCommunity };
