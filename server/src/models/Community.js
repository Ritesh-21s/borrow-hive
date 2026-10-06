const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    emailDomain: { type: String, required: true, lowercase: true, trim: true },
    inviteCode: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: '' },
    memberCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

communitySchema.index({ emailDomain: 1 });
// Note: inviteCode index is created automatically via unique:true on the field

module.exports = mongoose.model('Community', communitySchema);
