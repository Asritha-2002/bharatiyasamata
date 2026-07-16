const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kycSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'KycSubmission', required: true },

    monthIndex: { type: Number, required: true }, // 1 through 12
    scheduledMonth: { type: Date, required: true }, // first of that calendar month
    amount: { type: Number, required: true, default: 10000 },

    status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: null } // optional admin note, e.g. transaction ref
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payout', payoutSchema);