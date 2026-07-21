const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendSOPromotionEmail } = require('./sendEmail');
// Given a parent user, check whether they now qualify for RO -> SO promotion.
//
// Promotion rule: as soon as the parent has at least `soRequiredRoCount`
// ROs (or higher -- SO counts too) among ALL of their direct recruits,
// regardless of how many total recruits they have or how those recruits
// are grouped into batches. Batching (soRequiredBatchSize) is a separate,
// purely visual/grouping concept used elsewhere in the app (e.g. the
// dashboard's batch display) -- it has no bearing on this promotion check.
async function checkAndPromoteToSO(parentId) {
  const parent = await User.findById(parentId);
  if (!parent || parent.role === 'ADMIN' || parent.role === 'SO') return;
  // Already SO or is Admin — nothing to do.

  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});

  const { soRequiredRoCount } = settings;

  const children = await User.find({ referredBy: parentId });

  const roCount = children.filter((c) => c.role === 'RO' || c.role === 'SO').length;

  if (roCount >= soRequiredRoCount) {
    parent.role = 'SO';
    await parent.save();
     try {
      await sendSOPromotionEmail({
        to: parent.email,
        name: parent.name,
        regNo: parent.regNo
      });
    } catch (emailErr) {
      console.error('Failed to send SO promotion email:', emailErr.message);
    }
  }
}

// Called from the Razorpay webhook whenever a payment is captured for a linked user.
// Increments their yearly book count, flags them as purchased, promotes
// VOLUNTEER -> RO once they've bought 2+ books total this year, then checks
// whether their parent now qualifies for RO -> SO promotion.
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