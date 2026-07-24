const express = require('express');
const uploadPdf = require('../middleware/uploadPdf.js');
const {
  getDownloads,
  getDownloadById,
  addDownload,
  updateDownload,
  deleteDownload,
  reorderDownloads,
} = require('../controllers/downloadController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', getDownloads);
router.put('/reorder', protect, adminOnly, reorderDownloads);
router.get('/:id', getDownloadById);
router.post('/', protect, adminOnly, uploadPdf.single('pdf'), addDownload);
router.put('/:id', protect, adminOnly, uploadPdf.single('pdf'), updateDownload);
router.delete('/:id', protect, adminOnly, deleteDownload);

module.exports = router;