const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    transactionType: {
      type: String,
      enum: ['borrow', 'sale', 'ride', 'favor'],
      required: true,
    },
    transactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One review per transaction per reviewer
reviewSchema.index({ reviewerId: 1, transactionId: 1 }, { unique: true });
reviewSchema.index({ revieweeId: 1, communityId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
