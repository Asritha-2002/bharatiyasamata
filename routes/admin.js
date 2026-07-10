const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { handlePurchaseConfirmed } = require('../utils/batchLogic');

const router = express.Router();

// GET /api/admin/users — list everyone, for the manual toggle UI
router.get('/users', protect, adminOnly, async (req, res) => {
  const users = await User.find()
    .select('name email contactNumber role referralCode hasPurchasedBooks referredBy orderInParent')
    .sort({ createdAt: 1 });
  res.json(users);
});

// PATCH /api/admin/users/:id/confirm-purchase
// This is today's manual stand-in for a real payment webhook.
router.patch('/users/:id/confirm-purchase', protect, adminOnly, async (req, res) => {
  try {
    const updatedUser = await handlePurchaseConfirmed(req.params.id);
    res.json({ message: 'Purchase confirmed. Role updated if applicable.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;