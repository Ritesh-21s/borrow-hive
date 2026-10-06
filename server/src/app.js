const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { validate: validateEnv } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth');
const communityRoutes = require('./routes/communities');
const listingRoutes = require('./routes/listings');
const borrowRoutes = require('./routes/borrowRequests');
const rideRoutes = require('./routes/rides');
const favorRoutes = require('./routes/favors');
const conversationRoutes = require('./routes/conversations');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const borrowPostRoutes = require('./routes/borrowPosts');

validateEnv();

const app = express();

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL].filter(Boolean)
  : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000', process.env.CLIENT_URL].filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile native) or matching origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// General rate limit
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/borrow-requests', borrowRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/favors', favorRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/borrow-posts', borrowPostRoutes);

// Root status & Health check
app.get('/', (req, res) => res.json({
  success: true,
  message: 'BorrowHive API is running 🚀',
  status: 'online',
  version: '1.0.0',
}));
app.get(['/health', '/api/health'], (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
