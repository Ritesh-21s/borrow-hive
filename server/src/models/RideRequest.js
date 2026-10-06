const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    seatsRequested: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

rideRequestSchema.index({ rideId: 1, status: 1 });
rideRequestSchema.index({ requesterId: 1 });
rideRequestSchema.index({ communityId: 1 });

module.exports = mongoose.model('RideRequest', rideRequestSchema);
