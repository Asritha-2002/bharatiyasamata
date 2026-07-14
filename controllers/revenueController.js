const Payment = require('../models/VolunteerRegistration');

// GET /api/admin/revenue (admin only)
// Returns summary stats (total revenue, books sold, transaction count,
// average order value) plus the full list of captured transactions, newest
// first. Only CAPTURED payments count -- CREATED (abandoned/incomplete) and
// FAILED attempts are excluded from both the summary AND the list, since
// those rows have null booksHelperName/regNo/etc and don't represent real
// completed purchases.
async function getRevenueOverview(req, res) {
  try {
    const [summary] = await Payment.aggregate([
      { $match: { status: 'CAPTURED' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          booksSold: { $sum: '$numberOfFreeBooks' },
          transactions: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = summary?.totalRevenue || 0;
    const booksSold = summary?.booksSold || 0;
    const transactions = summary?.transactions || 0;
    const avgOrderValue = transactions > 0 ? Math.round((totalRevenue / transactions) * 100) / 100 : 0;

    const recentTransactions = await Payment.find({ status: 'CAPTURED' }).sort({ createdAt: -1 });

    res.status(200).json({
      summary: {
        totalRevenue,
        booksSold,
        transactions,
        avgOrderValue,
      },
      transactions: recentTransactions,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load revenue data',
      error: err.message,
    });
  }
}

module.exports = { getRevenueOverview };