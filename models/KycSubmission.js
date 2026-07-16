const mongoose = require('mongoose');

// One KYC submission per user (upserted, not appended -- resubmitting after
// a rejection updates the same record rather than creating duplicates).
const kycSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    aadhaarNumber: { type: String, required: true, trim: true },
    aadhaarImageUrl: { type: String, required: true },
    aadhaarImagePublicId: { type: String, required: true },

    accountHolderName: { type: String, required: true, trim: true },
    bankAccountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    chequeImageUrl: { type: String, required: true },
    chequeImagePublicId: { type: String, required: true },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    rejectionReason: { type: String, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('KycSubmission', kycSubmissionSchema);