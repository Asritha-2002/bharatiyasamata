const express = require('express');
const upload = require('../middleware/upload.js');
const { getBanner, saveBanner, deleteBanner } = require('../controllers/bannerController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: anyone can view the current banner
router.get('/', getBanner);

// Admin only: create or replace the banner (multipart/form-data, field name "image")
// protect runs first -- it decodes the JWT and sets req.userId / req.userRole.
// adminOnly then checks req.userRole, so it must come AFTER protect, not instead of it.
router.post('/', protect, adminOnly, upload.single('image'), saveBanner);
router.put('/', protect, adminOnly, upload.single('image'), saveBanner);

// Admin only: remove the current banner entirely
router.delete('/', protect, adminOnly, deleteBanner);

module.exports = router;