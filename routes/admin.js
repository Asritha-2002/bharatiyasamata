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

// GET /api/admin/hierarchy/:regNo
// Returns the target member, their full ancestor chain (up to Admin),
// and their full descendant tree (everyone below them, any depth).
router.get('/hierarchy/:regNo', protect, adminOnly, async (req, res) => {
  try {
    const { regNo } = req.params;

    const target = await User.findOne({ regNo })
      .select('name email contactNumber role regNo referredBy hasPurchasedBooks orderInParent');

    if (!target) {
      return res.status(404).json({ error: 'No member found with that Registration ID.' });
    }

    // ---- Ancestors: walk up referredBy until we hit Admin/null ----
    const ancestors = [];
    let currentParentId = target.referredBy;
    while (currentParentId) {
      const parent = await User.findById(currentParentId)
        .select('name email contactNumber role regNo referredBy');
      if (!parent) break;
      ancestors.unshift(parent); // build root-first order
      currentParentId = parent.referredBy;
    }

    // ---- Descendants: single efficient query for the ENTIRE subtree, any depth ----
    const result = await User.aggregate([
      { $match: { _id: target._id } },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'referredBy',
          as: 'descendants',
          depthField: 'depth'
        }
      },
      {
        $project: {
          descendants: {
            _id: 1,
            name: 1,
            email: 1,
            contactNumber: 1,
            role: 1,
            regNo: 1,
            referredBy: 1,
            hasPurchasedBooks: 1,
            orderInParent: 1,
            depth: 1
          }
        }
      }
    ]);

    const descendants = result[0]?.descendants || [];

    res.json({ target, ancestors, descendants });
  } catch (err) {
    console.error('hierarchy lookup error:', err);
    res.status(500).json({ error: err.message });
  }
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