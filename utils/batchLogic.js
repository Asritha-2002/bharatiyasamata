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

  // Check if ANY batch has exactly 12 members, all purchased
  for (const batchNumber in batches) {
    const batch = batches[batchNumber];
    if (batch.length === 12 && batch.every((c) => c.hasPurchasedBooks)) {
      parent.role = 'SO';
      await parent.save();
      return; // one completed batch is enough — stop checking further
    }
  }
}

// Called when a Volunteer's purchase is marked true.
// Promotes them individually, then checks if their parent's batch is now complete.
async function handlePurchaseConfirmed(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.hasPurchasedBooks = true;
  user.lastPurchaseYear = new Date().getFullYear();

  // Volunteer -> RO promotion (individual, one-time)
  if (user.role === 'VOLUNTEER') {
    user.role = 'RO';
  }

  await user.save();

  // Now check if this triggers the parent's RO -> SO promotion
  if (user.referredBy) {
    await checkAndPromoteToSO(user.referredBy);
  }

  return user;
}

module.exports = { checkAndPromoteToSO, handlePurchaseConfirmed };