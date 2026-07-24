const express = require('express');
const uploadPdf = require('../middleware/uploadPdf.js');
const {
  getHowToHelps,
  getHowToHelpById,
  addHowToHelp,
  updateHowToHelp,
  deleteHowToHelp,
  reorderHowToHelps,
} = require('../controllers/howToHelpController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', getHowToHelps);
router.put('/reorder', protect, adminOnly, reorderHowToHelps);
router.get('/:id', getHowToHelpById);
router.post('/', protect, adminOnly, uploadPdf.single('pdf'), addHowToHelp);
router.put('/:id', protect, adminOnly, uploadPdf.single('pdf'), updateHowToHelp);
router.delete('/:id', protect, adminOnly, deleteHowToHelp);

module.exports = router;