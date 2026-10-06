const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 min
  10,
  'Too many login attempts. Please try again in 15 minutes.'
);

const createLimiterStrict = createLimiter(
  60 * 1000, // 1 min
  5,
  'You are creating too many items too quickly. Please slow down.'
);

const messageLimiter = createLimiter(
  60 * 1000,
  30,
  'You are sending messages too quickly.'
);

const generalLimiter = createLimiter(
  15 * 60 * 1000,
  200,
  'Too many requests. Please slow down.'
);

module.exports = { authLimiter, createLimiterStrict, messageLimiter, generalLimiter };
