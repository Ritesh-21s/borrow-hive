const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    type: {
      type: String,
      enum: [
        'borrow_accepted', 'borrow_rejected', 'borrow_request_received', 'borrow_request_sent',
        'return_reminder', 'item_overdue', 'borrow_returned',
        'ride_accepted', 'ride_rejected', 'ride_request_received', 'ride_booked', 'ride_published', 'ride_cancelled',
        'favor_accepted', 'favor_completed', 'favor_posted',
        'listing_published',
        'new_message', 'review_received',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
