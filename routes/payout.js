const express = require('express');
const {
  getMyPayouts,
  getUserPayouts,
  getPayoutSummary,
  markPayoutPaid,
} = require('../controllers/payoutController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Any logged-in user: see their own schedule
router.get('/me', protect, getMyPayouts);

// Admin only
router.get('/summary', protect, adminOnly, getPayoutSummary);
router.get('/user/:userId', protect, adminOnly, getUserPayouts);
router.patch('/:id/mark-paid', protect, adminOnly, markPayoutPaid);

module.exports = router;