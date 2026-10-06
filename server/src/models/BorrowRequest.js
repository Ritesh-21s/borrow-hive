const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'BORROWED', 'RETURNED', 'OVERDUE', 'CANCELLED'],
      default: 'PENDING',
    },
    note: { type: String, default: '' },
    returnReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

borrowRequestSchema.index({ listingId: 1, status: 1 });
borrowRequestSchema.index({ borrowerId: 1, status: 1 });
borrowRequestSchema.index({ ownerId: 1, status: 1 });
borrowRequestSchema.index({ communityId: 1 });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
