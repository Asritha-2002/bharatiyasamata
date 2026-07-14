const express = require('express');
const { getRevenueOverview } = require('../controllers/revenueController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', protect, adminOnly, getRevenueOverview);

module.exports = router;