const express = require('express');
const VolunteerRegistration = require('../models/VolunteerRegistration');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my-history', protect, async (req, res) => {
  const history = await VolunteerRegistration.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .select('numberOfFreeBooks amount status createdAt razorpayPaymentId');
  res.json(history);
});

module.exports = router;