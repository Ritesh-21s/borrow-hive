const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Community = require('../models/Community');
const { generateToken } = require('../utils/jwt');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, inviteCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Detect community from email domain
    const domain = email.split('@')[1]?.toLowerCase();
    let community = await Community.findOne({ emailDomain: domain, isActive: true });

    if (!community) {
      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          message: 'We could not match your email to a community. Please provide an invite code.',
          requiresInviteCode: true,
        });
      }
      community = await Community.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true });
      if (!community) {
        return res.status(404).json({ success: false, message: 'Invalid invite code.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      communityId: community._id,
    });

    await Community.findByIdAndUpdate(community._id, { $inc: { memberCount: 1 } });

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { token, user: user.toSafeObject(), community },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const community = await Community.findById(user.communityId);
    const token = generateToken(user._id);
    return res.json({
      success: true,
      message: 'Logged in successfully.',
      data: { token, user: user.toSafeObject(), community },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const community = await Community.findById(req.user.communityId);
    return res.json({
      success: true,
      message: 'User fetched.',
      data: { user: req.user, community },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
