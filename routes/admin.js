const express = require('express');
const User = require('../models/User');
const VolunteerRegistration = require('../models/VolunteerRegistration');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users', protect, adminOnly, async (req, res) => {
  const users = await User.find()
    .select('name email contactNumber role referralCode hasPurchasedBooks referredBy orderInParent totalBooksThisYear')
    .sort({ createdAt: 1 });
  res.json(users);
});

// NEW — real revenue/books-sold data for the admin Revenue tab
router.get('/revenue', protect, adminOnly, async (req, res) => {
  const paidTransactions = await VolunteerRegistration.find({ status: 'CAPTURED' })
    .sort({ createdAt: -1 });

  const totalRevenue = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalBooksSold = paidTransactions.reduce((sum, t) => sum + (t.numberOfFreeBooks || 0), 0);
  const totalTransactions = paidTransactions.length;
  const avgOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  const recentTransactions = paidTransactions.slice(0, 20).map((t) => ({
    id: t._id,
    razorpayPaymentId: t.razorpayPaymentId,
    booksHelperName: t.booksHelperName,
    email: t.email,
    amount: t.amount,
    numberOfFreeBooks: t.numberOfFreeBooks,
    createdAt: t.createdAt
  }));

  res.json({
    totalRevenue,
    totalBooksSold,
    totalTransactions,
    avgOrderValue,
    recentTransactions
  });
});

module.exports = router;