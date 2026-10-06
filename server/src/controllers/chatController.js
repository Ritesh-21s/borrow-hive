const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * GET /api/conversations
 * Returns all conversations the current user is a participant of
 */
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      communityId: req.user.communityId,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name avatar');
    return res.json({ success: true, data: { conversations } });
  } catch (err) { next(err); }
};

/**
 * POST /api/conversations
 * Find or create a 1:1 conversation
 */
const createConversation = async (req, res, next) => {
  try {
    const { participantId, contextType, contextId } = req.body;
    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId is required.' });
    }
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start a conversation with yourself.' });
    }

    const other = await User.findById(participantId);
    if (!other || other.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community messaging is not allowed.' });
    }

    // Find existing conversation
    let convo = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      communityId: req.user.communityId,
    }).populate('participants', 'name avatar');

    if (!convo) {
      convo = await Conversation.create({
        participants: [req.user._id, participantId],
        communityId: req.user.communityId,
        contextType: contextType || 'direct',
        contextId: contextId || null,
      });
      convo = await convo.populate('participants', 'name avatar');
    }

    return res.status(201).json({ success: true, data: { conversation: convo } });
  } catch (err) { next(err); }
};

/**
 * GET /api/conversations/:id/messages
 * Only participants can read messages
 */
const getMessages = async (req, res, next) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (!convo.participants.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });
    }

    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ conversationId: convo._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('senderId', 'name avatar');

    // Mark messages as read
    await Message.updateMany(
      { conversationId: convo._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset unread count
    await Conversation.findByIdAndUpdate(convo._id, {
      $set: { [`unreadCounts.${req.user._id}`]: 0 },
    });

    return res.json({ success: true, data: { messages: messages.reverse() } });
  } catch (err) { next(err); }
};

/**
 * POST /api/conversations/:id/messages
 * Only participants can send messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const { text, image } = req.body;
    const hasText = text && text.trim().length > 0;
    const hasImage = image && image.url;

    if (!hasText && !hasImage) {
      return res.status(400).json({ success: false, message: 'Message must have text or an image.' });
    }

    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (!convo.participants.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });
    }

    const message = await Message.create({
      conversationId: convo._id,
      senderId: req.user._id,
      text: hasText ? text.trim() : '',
      image: hasImage ? { url: image.url, publicId: image.publicId || null } : undefined,
      readBy: [req.user._id],
    });

    await message.populate('senderId', 'name avatar');

    // Conversation preview text
    const previewText = hasText ? text.trim() : '📷 Photo';

    // Update conversation metadata
    const otherParticipants = convo.participants.filter((p) => p.toString() !== req.user._id.toString());
    const unreadUpdate = {};
    otherParticipants.forEach((p) => {
      unreadUpdate[`unreadCounts.${p}`] = (convo.unreadCounts?.get?.(p.toString()) || 0) + 1;
    });

    await Conversation.findByIdAndUpdate(convo._id, {
      lastMessage: previewText,
      lastMessageAt: new Date(),
      $set: unreadUpdate,
    });

    // Push notify other participants
    for (const participantId of otherParticipants) {
      const other = await User.findById(participantId);
      if (other?.pushToken) {
        await sendPushNotification({
          pushToken: other.pushToken,
          user: other,
          type: 'new_message',
          title: req.user.name,
          body: previewText.substring(0, 100),
          data: { conversationId: convo._id },
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Message sent.', data: { message } });
  } catch (err) { next(err); }
};

module.exports = { getConversations, createConversation, getMessages, sendMessage };
