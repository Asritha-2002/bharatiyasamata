const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  contactNumber: { type: String, required: true },
  password: { type: String, required: true },

  // Role: everyone starts as Volunteer. RO unlocks recruiting. SO is just a tag.
  role: {
    type: String,
    enum: ['ADMIN', 'VOLUNTEER', 'RO', 'SO'],
    default: 'VOLUNTEER'
  },

  // Every user gets their own referral code immediately at signup —
  // but a VOLUNTEER's code is inert until they're promoted to RO.
  referralCode: { type: String, required: true, unique: true },

  // Who recruited this person. null only for Admin.
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Position among their parent's recruits, in join order — this is what
  // determines which batch-of-12 this person belongs to.
  orderInParent: { type: Number, default: 0 },

  // Manual toggle for today's goal (no payment gateway yet).
  // Flipping this to true is what triggers Volunteer -> RO promotion.
  hasPurchasedBooks: { type: Boolean, default: false },

  // Tracks the annual requirement separately from the one-time first purchase.
  lastPurchaseYear: { type: Number, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);