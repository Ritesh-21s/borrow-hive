const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    // Optional context reference
    contextType: { type: String, enum: ['listing', 'ride', 'favor', 'direct'], default: 'direct' },
    contextId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ communityId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
