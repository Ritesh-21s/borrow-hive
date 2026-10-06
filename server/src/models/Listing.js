const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
});

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['electronics', 'books', 'clothing', 'furniture', 'sports', 'tools', 'kitchen', 'other'],
      default: 'other',
    },
    price: { type: Number, default: 0, min: 0 }, // Used for price (Sell) or budget (Buy)
    budget: { type: Number, default: 0, min: 0 },
    condition: {
      type: String,
      default: 'good',
    },
    acceptedConditions: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ['sell', 'buy', 'sale', 'borrow', 'both'],
      required: true,
      default: 'sell',
    },
    imageUrl: { type: String, default: '' },
    images: { type: [imageSchema], default: [] },
    status: {
      type: String,
      enum: ['open', 'closed', 'active', 'sold', 'completed', 'cancelled'],
      default: 'open',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

listingSchema.index({ communityId: 1, status: 1 });
listingSchema.index({ communityId: 1, category: 1 });
listingSchema.index({ communityId: 1, type: 1 });
listingSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Listing', listingSchema);
