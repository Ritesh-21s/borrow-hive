const mongoose = require('mongoose');

const borrowPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['electronics', 'books', 'clothing', 'furniture', 'sports', 'tools', 'kitchen', 'other'],
      default: 'other',
    },
    imageUrl: { type: String, default: '' },
    neededFrom: { type: Date, required: true },
    neededUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

borrowPostSchema.index({ communityId: 1, status: 1 });
borrowPostSchema.index({ neededUntil: 1 });
borrowPostSchema.index({ requesterId: 1 });

module.exports = mongoose.model('BorrowPost', borrowPostSchema);
