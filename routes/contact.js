const express = require('express');
const {
  submitContactMessage,
  getContactMessages,
  markContactMessageRead,
  deleteContactMessage,
} = require('../controllers/contactController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: anyone visiting the site can submit the contact form
router.post('/', submitContactMessage);

// Admin only: view/manage submitted messages (for the Contact History tab)
router.get('/', protect, adminOnly, getContactMessages);
router.patch('/:id/read', protect, adminOnly, markContactMessageRead);
router.delete('/:id', protect, adminOnly, deleteContactMessage);

module.exports = router;