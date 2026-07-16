const Payout = require('../models/Payout');

// GET /api/payouts/me (any logged-in user) -- their own 12-month schedule
async function getMyPayouts(req, res) {
  try {
    const payouts = await Payout.find({ user: req.userId }).sort({ monthIndex: 1 });
    res.status(200).json({ payouts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load payout schedule', error: err.message });
  }
}

// GET /api/payouts/user/:userId (admin only) -- a specific member's schedule
async function getUserPayouts(req, res) {
  try {
    const payouts = await Payout.find({ user: req.params.userId }).sort({ monthIndex: 1 });
    res.status(200).json({ payouts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load payout schedule', error: err.message });
  }
}

// GET /api/payouts/summary (admin only) -- one row per SO with paid/pending counts
async function getPayoutSummary(req, res) {
  try {
    const allPayouts = await Payout.find().populate('user', 'name email regNo');

    const grouped = {};
    allPayouts.forEach((p) => {
      if (!p.user) return; // guard against a deleted user
      const uid = String(p.user._id);
      if (!grouped[uid]) {
        grouped[uid] = { user: p.user, totalMonths: 0, paidMonths: 0, pendingMonths: 0 };
      }
      grouped[uid].totalMonths++;
      if (p.status === 'PAID') grouped[uid].paidMonths++;
      else grouped[uid].pendingMonths++;
    });

    res.status(200).json({ summary: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load payout summary', error: err.message });
  }
}

// PATCH /api/payouts/:id/mark-paid (admin only) -- manual ledger update, no real gateway
async function markPayoutPaid(req, res) {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: 'PAID',
        paidAt: new Date(),
        paidBy: req.userId,
        note: req.body.note || null,
      },
      { new: true }
    );
    if (!payout) return res.status(404).json({ message: 'Payout record not found' });
    res.status(200).json({ payout });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark payout as paid', error: err.message });
  }
}

module.exports = { getMyPayouts, getUserPayouts, getPayoutSummary, markPayoutPaid };