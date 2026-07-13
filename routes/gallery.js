const express = require('express');
const upload = require('../middleware/upload.js');
const {
  getGallery,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  reorderGallery,
} = require('../controllers/galleryController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: anyone can view the gallery
router.get('/', getGallery);

// Admin only: add a new image (multipart/form-data, field name "image",
// optional "caption" text field)
router.post('/', protect, adminOnly, upload.single('image'), addGalleryImage);

// IMPORTANT: this must be registered before '/:id' below, otherwise Express
// will match "reorder" as the :id param and it'll never be reached.
router.put('/reorder', protect, adminOnly, reorderGallery);

// Admin only: replace an image's file and/or caption
router.put('/:id', protect, adminOnly, upload.single('image'), updateGalleryImage);

// Admin only: remove an image
router.delete('/:id', protect, adminOnly, deleteGalleryImage);

module.exports = router;