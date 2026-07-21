const Settings = require('../models/Settings');

// GET /api/settings -- public. Anything on the site that needs the current
// price-per-book, annual target, or payout numbers reads from here instead
// of a hardcoded constant. If no settings document exists yet (first run),
// one is created with schema defaults so this never returns null.
async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({ settings });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load settings',
      error: err.message,
    });
  }
}

// PUT /api/settings (admin only) -- upserts the single settings document.
async function updateSettings(req, res) {
  try {
    const {
      pricePerBook,
      annualBookTarget,
      soRequireFullBatch,
      soRequiredBatchSize,
      soRequiredRoCount,
      soPayoutAmountPerMonth,
      soPayoutDurationMonths,
    } = req.body;

    // Basic sanity checks -- these are program-critical numbers, so we
    // don't trust the frontend's own validation alone.
    const numericFields = {
      pricePerBook,
      annualBookTarget,
      soRequiredBatchSize,
      soRequiredRoCount,
      soPayoutAmountPerMonth,
      soPayoutDurationMonths,
    };
    for (const [key, value] of Object.entries(numericFields)) {
      if (value !== undefined && (typeof value !== 'number' || value < 0 || Number.isNaN(value))) {
        return res.status(400).json({ message: `${key} must be a valid non-negative number` });
      }
    }
    if (soRequireFullBatch !== undefined && typeof soRequireFullBatch !== 'boolean') {
      return res.status(400).json({ message: 'soRequireFullBatch must be true or false' });
    }

    const update = {
      ...(pricePerBook !== undefined && { pricePerBook }),
      ...(annualBookTarget !== undefined && { annualBookTarget }),
      ...(soRequireFullBatch !== undefined && { soRequireFullBatch }),
      ...(soRequiredBatchSize !== undefined && { soRequiredBatchSize }),
      ...(soRequiredRoCount !== undefined && { soRequiredRoCount }),
      ...(soPayoutAmountPerMonth !== undefined && { soPayoutAmountPerMonth }),
      ...(soPayoutDurationMonths !== undefined && { soPayoutDurationMonths }),
      updatedBy: req.userId,
    };

    const settings = await Settings.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    res.status(200).json({ settings });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update settings',
      error: err.message,
    });
  }
}

module.exports = { getSettings, updateSettings };