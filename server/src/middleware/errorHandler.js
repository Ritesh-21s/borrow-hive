/**
 * Global error handler — never leaks stack traces to clients
 */
const errorHandler = (err, req, res, next) => {
  // Log internally
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  // Default: generic 500, no internal details
  const status = err.statusCode || err.status || 500;
  const message = status < 500 ? err.message : 'Something went wrong. Please try again.';
  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
