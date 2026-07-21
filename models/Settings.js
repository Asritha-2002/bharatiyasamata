const mongoose = require('mongoose');

// Singleton document -- only one ever exists, same pattern as your Banner
// model. This centralizes every program-level number that used to be
// hardcoded across the backend (purchase.js, batchLogic.js) and frontend
// (Checkout.jsx, UserDashboard.jsx, MyPayoutSchedule.jsx), so an admin can
// change them without a code deploy.
const settingsSchema = new mongoose.Schema(
  {
    // ---- Book purchase pricing ----
    pricePerBook: {
      type: Number,
      required: true,
      default: 60,
      min: 1,
    },

    // The denominator shown in "X / annualBookTarget" progress displays
    // (e.g. AnnualPurchaseBanner).
    annualBookTarget: {
      type: Number,
      required: true,
      default: 202,
      min: 1,
    },

    // ---- RO -> SO promotion rule ----
    // If true, a batch must have exactly `soRequiredBatchSize` members
    // AND at least `soRequiredRoCount` of them must be RO before the
    // parent is promoted to SO (the original "full batch of 12" rule).
    // If false, promotion happens as soon as at least `soRequiredRoCount`
    // of the parent's recruits (regardless of total recruit count) are RO
    // -- the simplified rule you moved to most recently.
    soRequireFullBatch: {
      type: Boolean,
      required: true,
      default: false,
    },
    soRequiredBatchSize: {
      type: Number,
      required: true,
      default: 12,
      min: 1,
    },
    soRequiredRoCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // ---- SO monthly payout schedule ----
    soPayoutAmountPerMonth: {
      type: Number,
      required: true,
      default: 10000,
      min: 0,
    },
    soPayoutDurationMonths: {
      type: Number,
      required: true,
      default: 12,
      min: 1,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);