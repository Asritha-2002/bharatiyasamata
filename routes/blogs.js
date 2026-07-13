const express = require('express');
const upload = require('../middleware/upload.js');
const {
  getBlogs,
  
  getBlogBySku,
  addBlog,
  updateBlog,
  deleteBlog,
  reorderBlogs,
} = require('../controllers/blogController.js');
const { protect, adminOnly } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public: anyone can view blogs
router.get('/', getBlogs);

// IMPORTANT: must come before '/:id' or Express will treat "reorder" as an id
router.put('/reorder', protect, adminOnly, reorderBlogs);


router.get('/:sku', getBlogBySku);


// Admin only: create a blog. multipart/form-data with fields:
// title, sku, description, priority (optional), image (optional file)
router.post('/', protect, adminOnly, upload.single('image'), addBlog);

router.put('/:id', protect, adminOnly, upload.single('image'), updateBlog);

router.delete('/:id', protect, adminOnly, deleteBlog);

module.exports = router;