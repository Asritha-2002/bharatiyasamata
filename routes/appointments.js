const express = require('express');
const upload = require('../middleware/upload.js');
const {
  getAppointments,
  getAppointmentById,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  reorderAppointments,
} = require('../controllers/appointmentController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: anyone can view
router.get('/', getAppointments);

// IMPORTANT: must come before '/:id' or Express will treat "reorder" as an id
router.put('/reorder', protect, adminOnly, reorderAppointments);

router.get('/:id', getAppointmentById);

// Admin only: create/update/delete
router.post('/', protect, adminOnly, upload.single('image'), addAppointment);
router.put('/:id', protect, adminOnly, upload.single('image'), updateAppointment);
router.delete('/:id', protect, adminOnly, deleteAppointment);

module.exports = router;