const express = require('express');
const upload = require('../middleware/upload.js');
const {
  getMyKyc,
  submitKyc,
  getAllKyc,
  approveKyc,
  rejectKyc,
} = require('../controllers/kycController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Any logged-in user: check their own status, submit/resubmit
router.get('/me', protect, getMyKyc);
router.post(
  '/',
  protect,
  upload.fields([
    { name: 'aadhaarImage', maxCount: 1 },
    { name: 'chequeImage', maxCount: 1 },
  ]),
  submitKyc
);

// Admin only: review submissions
router.get('/', protect, adminOnly, getAllKyc);
router.patch('/:id/approve', protect, adminOnly, approveKyc);
router.patch('/:id/reject', protect, adminOnly, rejectKyc);

module.exports = router;