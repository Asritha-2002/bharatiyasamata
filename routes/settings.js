const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: any page that needs current pricing/target/payout numbers reads this
router.get('/', getSettings);

// Admin only: change the numbers
router.put('/', protect, adminOnly, updateSettings);

module.exports = router;