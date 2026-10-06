const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['offer', 'request'], default: 'offer' },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    departureTime: { type: Date, required: true }, // also serves as startTime / time
    startTime: { type: Date },
    totalSeats: { type: Number, default: 1, min: 1, max: 8 },
    availableSeats: { type: Number, default: 1, min: 0 },
    seatsLeft: { type: Number, default: 1, min: 0 },
    pricePerSeat: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    status: {
      type: String,
      enum: ['open', 'started', 'completed', 'closed', 'active', 'full', 'cancelled'],
      default: 'open',
    },
    // Live location text
    currentLocationText: { type: String, default: '' },
    locationUpdatedAt: { type: Date, default: null },
    hourReminderSent: { type: Boolean, default: false },
    fifteenReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

rideSchema.pre('save', function (next) {
  if (this.startTime && !this.departureTime) {
    this.departureTime = this.startTime;
  }
  if (this.departureTime && !this.startTime) {
    this.startTime = this.departureTime;
  }
  if (this.seatsLeft !== undefined && this.availableSeats === undefined) {
    this.availableSeats = this.seatsLeft;
  }
  if (this.availableSeats !== undefined && this.seatsLeft === undefined) {
    this.seatsLeft = this.availableSeats;
  }
  if (this.driverId && !this.ownerId) {
    this.ownerId = this.driverId;
  }
  if (this.ownerId && !this.driverId) {
    this.driverId = this.ownerId;
  }
  if (this.requesterId && !this.ownerId) {
    this.ownerId = this.requesterId;
  }
  next();
});

rideSchema.index({ communityId: 1, status: 1 });
rideSchema.index({ communityId: 1, departureTime: 1 });
rideSchema.index({ from: 'text', to: 'text' });

module.exports = mongoose.model('Ride', rideSchema);
