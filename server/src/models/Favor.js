const mongoose = require('mongoose');

const favorSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['tools', 'delivery', 'moving', 'tech', 'food', 'other'],
      default: 'other',
    },
    location: { type: String, default: '' },
    deadline: { type: Date },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    posterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    status: {
      type: String,
      enum: ['open', 'closed', 'accepted', 'completed', 'cancelled'],
      default: 'open',
    },
  },
  { timestamps: true }
);

favorSchema.pre('save', function (next) {
  if (this.requesterId && !this.posterId) {
    this.posterId = this.requesterId;
  }
  if (this.posterId && !this.requesterId) {
    this.requesterId = this.posterId;
  }
  next();
});

favorSchema.index({ communityId: 1, status: 1 });
favorSchema.index({ requesterId: 1 });
favorSchema.index({ deadline: 1 });

module.exports = mongoose.model('Favor', favorSchema);
