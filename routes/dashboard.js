const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, async (req, res) => {
  const me = await User.findById(req.userId).select('-password');

  if (!me) return res.status(404).json({ error: 'User not found.' });

  // Admin gets everything — no restriction
  if (me.role === 'ADMIN') {
    const everyone = await User.find({ role: { $ne: 'ADMIN' } })
  .select('name email contactNumber role referralCode regNo hasPurchasedBooks referredBy orderInParent totalBooksThisYear');
    return res.json({ role: 'ADMIN', me, everyone });
  }

  // Parent — contact info only, no progress
  const parent = me.referredBy
  ? await User.findById(me.referredBy).select('name email contactNumber role regNo')
  : null;

  // Children — contact info + batch progress
  const children = await User.find({ referredBy: me._id })
    .select('name email contactNumber role hasPurchasedBooks orderInParent')
    .sort({ orderInParent: 1 });

  // Grandchildren — contact info only, no progress
  const childIds = children.map((c) => c._id);
  const grandchildren = await User.find({ referredBy: { $in: childIds } })
  .select('name email contactNumber role referredBy')
  .sort({ orderInParent: 1 });

  // Can this person actually recruit? Only once they're RO or SO.
  const canRecruit = me.role === 'RO' || me.role === 'SO';

  res.json({
  me: {
    _id: me._id,
    name: me.name,
    email: me.email,
    role: me.role,
    referralCode: me.referralCode,
    regNo: me.regNo, 
    hasPurchasedBooks: me.hasPurchasedBooks,
    lastPurchaseYear: me.lastPurchaseYear,
    totalBooksThisYear: me.totalBooksThisYear,
    canRecruit
  },
  parent, // now includes parent.regNo automatically since it's in the select above
  children,
  grandchildren
});
});

module.exports = router;