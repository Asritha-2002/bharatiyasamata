const User = require('../models/User');

// Given a parent user, check all their children's batches.
// If any batch of 12 is fully complete (all 12 have hasPurchasedBooks = true),
// promote the parent from RO to SO.
async function checkAndPromoteToSO(parentId) {
  const parent = await User.findById(parentId);
  if (!parent || parent.role === 'ADMIN' || parent.role === 'SO') return;
  // Already SO or is Admin — nothing to do.

  const children = await User.find({ referredBy: parentId }).sort({ orderInParent: 1 });

  // Group children into batches of 12 based on orderInParent
  const batches = {};
  children.forEach((child) => {
    const batchNumber = Math.ceil(child.orderInParent / 12);
    if (!batches[batchNumber]) batches[batchNumber] = [];
    batches[batchNumber].push(child);
  });

  // Check if ANY batch has exactly 12 members, with at least one of them
  // already promoted to RO
  for (const batchNumber in batches) {
    const batch = batches[batchNumber];
    if (batch.some((c) => c.role === 'RO')) {
      parent.role = 'SO';
      await parent.save();
      return; // one qualifying batch is enough — stop checking further
    }
  }
}

// Called from the Razorpay webhook whenever a payment is captured for a linked user.
// Increments their yearly book count, flags them as purchased, promotes
// VOLUNTEER -> RO once they've bought 2+ books total this year, then checks
// whether their parent's batch just became complete (RO -> SO).
async function recordBookPurchase(userId, booksCount) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const currentYear = new Date().getFullYear();

  // Reset the running total if this is the first purchase of a NEW calendar year
  if (user.lastPurchaseYear !== currentYear) {
    user.totalBooksThisYear = 0;
  }

  user.totalBooksThisYear = (user.totalBooksThisYear || 0) + booksCount;
  user.hasPurchasedBooks = true;
  user.lastPurchaseYear = currentYear;

  // Volunteer -> RO promotion, only once total books this year reaches 2+
  if (user.role === 'VOLUNTEER' && user.totalBooksThisYear >= 2) {
    user.role = 'RO';
  }

  await user.save();

  // Now check if this triggers the parent's RO -> SO promotion
  if (user.referredBy) {
    await checkAndPromoteToSO(user.referredBy);
  }

  return user;
}

module.exports = { checkAndPromoteToSO, recordBookPurchase };