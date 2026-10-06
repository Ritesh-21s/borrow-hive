const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { startReturnReminderCron } = require('./utils/returnReminder');
const { startFavorExpiryCheck } = require('./utils/favorExpiryCheck');
const { startRideReminderCron } = require('./utils/rideReminderCron');
const { verifyToken } = require('./utils/jwt');
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const { setIo } = require('./utils/ioInstance');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setIo(io); // make io available to pushNotification util

// Auth middleware for Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  console.log(`🔌 Socket connected: ${socket.user.name} (${userId})`);

  // Join user's personal room for DMs
  socket.join(`user:${userId}`);

  // Join a conversation room
  socket.on('join_conversation', async (conversationId) => {
    try {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;
      const participantIds = convo.participants.map(String);
      if (!participantIds.includes(userId)) return; // security: only participants
      socket.join(`conversation:${conversationId}`);
    } catch (err) {
      console.error('join_conversation error:', err.message);
    }
  });

  // Real-time message send
  socket.on('send_message', async ({ conversationId, text, image }) => {
    try {
      const hasText = text && text.trim().length > 0;
      const hasImage = image && image.url;
      if (!conversationId || (!hasText && !hasImage)) return;

      const convo = await Conversation.findById(conversationId);
      if (!convo) return;
      const participantIds = convo.participants.map(String);
      if (!participantIds.includes(userId)) return;

      const message = await Message.create({
        conversationId,
        senderId: socket.user._id,
        text: hasText ? text.trim() : '',
        image: hasImage ? { url: image.url, publicId: image.publicId || null } : undefined,
        readBy: [socket.user._id],
      });

      await message.populate('senderId', 'name avatar');

      const previewText = hasText ? text.trim() : '📷 Photo';

      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: previewText,
        lastMessageAt: new Date(),
      });

      // Emit to all OTHER participants in the room (sender excluded — they have the optimistic message already)
      socket.to(`conversation:${conversationId}`).emit('new_message', {
        message,
        conversationId,
      });

      // Emit to offline participants' personal rooms
      participantIds
        .filter((id) => id !== userId)
        .forEach((id) => {
          io.to(`user:${id}`).emit('conversation_updated', {
            conversationId,
            lastMessage: previewText,
            lastMessageAt: new Date(),
          });
        });
    } catch (err) {
      console.error('send_message error:', err.message);
    }
  });

  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`conversation:${conversationId}`).emit('typing', {
      userId,
      name: socket.user.name,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.user.name}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  startReturnReminderCron();
  startFavorExpiryCheck();
  startRideReminderCron();
  server.listen(PORT, () => {
    console.log(`🚀 BorrowHive API running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
