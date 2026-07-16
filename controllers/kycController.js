const KycSubmission = require('../models/KycSubmission');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');
const User = require('../models/User');
const Payout = require('../models/Payout');
const AADHAAR_PATTERN = /^\d{12}$/;

// GET /api/kyc/me (any logged-in user) -- returns their own submission or null
async function getMyKyc(req, res) {
  try {
    const submission = await KycSubmission.findOne({ user: req.userId });
    res.status(200).json({ submission: submission || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load KYC status', error: err.message });
  }
}

// POST /api/kyc (any logged-in user) -- create or resubmit.
// multipart/form-data fields: aadhaarNumber, accountHolderName,
// bankAccountNumber, ifscCode, plus files "aadhaarImage" and "chequeImage".
// On resubmission after a rejection, a new file for either image is
// optional -- if omitted, the previously uploaded image is kept.
async function submitKyc(req, res) {
  try {
    const { aadhaarNumber, accountHolderName, bankAccountNumber, ifscCode } = req.body;

    if (!aadhaarNumber || !AADHAAR_PATTERN.test(aadhaarNumber.trim())) {
      return res.status(400).json({ message: 'A valid 12-digit Aadhaar number is required' });
    }
    if (!accountHolderName || !accountHolderName.trim()) {
      return res.status(400).json({ message: 'Account holder name is required' });
    }
    if (!bankAccountNumber || !bankAccountNumber.trim()) {
      return res.status(400).json({ message: 'Bank account number is required' });
    }
    if (!ifscCode || !ifscCode.trim()) {
      return res.status(400).json({ message: 'IFSC code is required' });
    }

    const existing = await KycSubmission.findOne({ user: req.userId });
    const aadhaarFile = req.files?.aadhaarImage?.[0];
    const chequeFile = req.files?.chequeImage?.[0];

    if (!existing && (!aadhaarFile || !chequeFile)) {
      return res.status(400).json({
        message: 'Both the Aadhaar image and the cancelled cheque image are required',
      });
    }

    let aadhaarImageUrl = existing?.aadhaarImageUrl;
    let aadhaarImagePublicId = existing?.aadhaarImagePublicId;
    if (aadhaarFile) {
      const result = await uploadBufferToCloudinary(aadhaarFile.buffer, { folder: 'kyc/aadhaar' });
      if (existing?.aadhaarImagePublicId) {
        cloudinary.uploader.destroy(existing.aadhaarImagePublicId).catch((err) => {
          console.error('Failed to remove old Aadhaar image:', err.message);
        });
      }
      aadhaarImageUrl = result.secure_url;
      aadhaarImagePublicId = result.public_id;
    }

    let chequeImageUrl = existing?.chequeImageUrl;
    let chequeImagePublicId = existing?.chequeImagePublicId;
    if (chequeFile) {
      const result = await uploadBufferToCloudinary(chequeFile.buffer, { folder: 'kyc/cheque' });
      if (existing?.chequeImagePublicId) {
        cloudinary.uploader.destroy(existing.chequeImagePublicId).catch((err) => {
          console.error('Failed to remove old cheque image:', err.message);
        });
      }
      chequeImageUrl = result.secure_url;
      chequeImagePublicId = result.public_id;
    }

    const update = {
      aadhaarNumber: aadhaarNumber.trim(),
      aadhaarImageUrl,
      aadhaarImagePublicId,
      accountHolderName: accountHolderName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      chequeImageUrl,
      chequeImagePublicId,
      // Resubmitting always resets to PENDING for a fresh review, whether
      // this is the first submission or a resubmission after rejection.
      status: 'PENDING',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
    };

    const submission = existing
      ? await KycSubmission.findOneAndUpdate({ user: req.userId }, update, { new: true })
      : await KycSubmission.create({ user: req.userId, ...update });

    res.status(existing ? 200 : 201).json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit KYC', error: err.message });
  }
}

// ---- Admin review endpoints ----

// GET /api/kyc (admin only)
async function getAllKyc(req, res) {
  try {
    const submissions = await KycSubmission.find()
      .populate('user', 'name email contactNumber regNo role')
      .sort({ createdAt: -1 });
    res.status(200).json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load KYC submissions', error: err.message });
  }
}

// PATCH /api/kyc/:id/approve (admin only)


// PATCH /api/kyc/:id/approve (admin only)
async function approveKyc(req, res) {
  try {
    const submission = await KycSubmission.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', rejectionReason: null, reviewedBy: req.userId, reviewedAt: new Date() },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    // Only State Organizers are eligible for the ₹10,000/month payout scheme.
    // KYC can be approved for anyone (identity verified either way), but the
    // payout schedule only generates for SO members, and only once.
    let payoutsCreated = false;
    const user = await User.findById(submission.user);

    if (user && user.role === 'SO') {
      const existingPayouts = await Payout.countDocuments({ user: user._id });
      if (existingPayouts === 0) {
        const startMonth = new Date();
        startMonth.setDate(1);
        startMonth.setHours(0, 0, 0, 0);

        const payouts = [];
        for (let i = 1; i <= 12; i++) {
          const scheduledMonth = new Date(startMonth);
          scheduledMonth.setMonth(scheduledMonth.getMonth() + (i - 1));
          payouts.push({
            user: user._id,
            kycSubmission: submission._id,
            monthIndex: i,
            scheduledMonth,
            amount: 10000,
            status: 'PENDING',
          });
        }
        await Payout.insertMany(payouts);
        payoutsCreated = true;
      }
    }

    res.status(200).json({ submission, payoutsCreated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve KYC', error: err.message });
  }
}

// PATCH /api/kyc/:id/reject (admin only) -- body: { reason }
async function rejectKyc(req, res) {
  try {
    const submission = await KycSubmission.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REJECTED',
        rejectionReason: req.body.reason || 'Please review and resubmit your details.',
        reviewedBy: req.userId,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    res.status(200).json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject KYC', error: err.message });
  }
}

module.exports = { getMyKyc, submitKyc, getAllKyc, approveKyc, rejectKyc };