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

  // Grandchildren — name only, no contact/role details. We only need their
  // _id (to group under the right child) and name (in case it's ever
  // displayed), plus how many recruits THEY have -- but as a count only,
  // never the actual great-grandchildren records themselves.
  const childIds = children.map((c) => c._id);
  const grandchildrenDocs = await User.find({ referredBy: { $in: childIds } })
    .select('name referredBy')
    .sort({ orderInParent: 1 });

  const grandchildIds = grandchildrenDocs.map((g) => g._id);

  // Count-only aggregation for great-grandchildren -- never fetch their
  // actual documents, just how many each grandchild has recruited.
  const greatGrandchildCounts = await User.aggregate([
    { $match: { referredBy: { $in: grandchildIds } } },
    { $group: { _id: '$referredBy', count: { $sum: 1 } } },
  ]);
  const countByGrandchild = new Map(
    greatGrandchildCounts.map((c) => [String(c._id), c.count])
  );

  const grandchildren = grandchildrenDocs.map((g) => ({
    _id: g._id,
    name: g.name,
    referredBy: g.referredBy,
    recruitCount: countByGrandchild.get(String(g._id)) || 0,
  }));

  // Can this person actually recruit? Only once they're RO or SO.
  const canRecruit = me.role === 'RO' || me.role === 'SO';

  res.json({
  me: {
    _id: me._id,
    name: me.name,
    email: me.email,
    contactNumber: me.contactNumber,
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