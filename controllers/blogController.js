const Blog = require('../models/Blog');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// GET /api/blogs -- public, sorted for display
async function getBlogs(req, res) {
  try {
    const blogs = await Blog.find().sort({ priority: 1 });
    res.status(200).json({ blogs });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load blogs',
      error: err.message,
    });
  }
}

async function getBlogBySku(req, res) {
  try {
    const blog = await Blog.findOne({ sku: req.params.sku });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.status(200).json({ blog });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load blog', error: err.message });
  }
}
// GET /api/blogs/:id -- public, single blog (e.g. for a detail page)
// async function getBlogById(req, res) {
//   try {
//     const blog = await Blog.findById(req.params.id);
//     if (!blog) {
//       return res.status(404).json({ message: 'Blog not found' });
//     }
//     res.status(200).json({ blog });
//   } catch (err) {
//     res.status(500).json({
//       message: 'Failed to load blog',
//       error: err.message,
//     });
//   }
// }

// POST /api/blogs (admin only)
// Image is optional -- req.file may be undefined and that's fine.
async function addBlog(req, res) {
  try {
    const { title, sku, description } = req.body;

    if (!title || !sku || !description) {
      return res.status(400).json({
        message: 'title, sku, and description are all required',
      });
    }

    const existingSku = await Blog.findOne({ sku });
    if (existingSku) {
      return res.status(409).json({ message: 'That SKU is already in use' });
    }

    let imageUrl = null;
    let cloudinaryPublicId = null;
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'blogs',
      });
      imageUrl = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    // priority is optional in the request -- if omitted, put the new blog
    // at the end of the list (same convention as the gallery).
    let priority = req.body.priority !== undefined ? Number(req.body.priority) : undefined;
    if (priority === undefined || Number.isNaN(priority)) {
      const last = await Blog.findOne().sort({ priority: -1 });
      priority = last ? last.priority + 1 : 0;
    }

    const blog = await Blog.create({
      title,
      sku,
      description,
      priority,
      imageUrl,
      cloudinaryPublicId,
      updatedBy: req.userId,
    });

    res.status(201).json({ blog });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add blog',
      error: err.message,
    });
  }
}

// PUT /api/blogs/:id (admin only)
// Priority is intentionally editable here too (unlike gallery) since blogs
// are edited one at a time far more often than reordered in bulk. If you
// send a priority that collides with another blog's, that's fine -- ties
// just sort by whichever was created first; use /reorder for a clean bulk
// re-sequence if you want gapless ordering.
async function updateBlog(req, res) {
  try {
    const existing = await Blog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const { title, sku, description, priority } = req.body;

    if (sku !== undefined && sku !== existing.sku) {
      const clash = await Blog.findOne({ sku, _id: { $ne: existing._id } });
      if (clash) {
        return res.status(409).json({ message: 'That SKU is already in use' });
      }
      existing.sku = sku;
    }

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (priority !== undefined && !Number.isNaN(Number(priority))) {
      existing.priority = Number(priority);
    }

    if (req.file) {
      const oldPublicId = existing.cloudinaryPublicId;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'blogs',
      });

      existing.imageUrl = result.secure_url;
      existing.cloudinaryPublicId = result.public_id;

      if (oldPublicId && oldPublicId !== result.public_id) {
        cloudinary.uploader.destroy(oldPublicId).catch((err) => {
          console.error('Failed to remove old blog image from Cloudinary:', err.message);
        });
      }
    }

    existing.updatedBy = req.userId;
    await existing.save();

    res.status(200).json({ blog: existing });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update blog',
      error: err.message,
    });
  }
}

// DELETE /api/blogs/:id (admin only)
async function deleteBlog(req, res) {
  try {
    const existing = await Blog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (existing.cloudinaryPublicId) {
      cloudinary.uploader.destroy(existing.cloudinaryPublicId).catch((err) => {
        console.error('Failed to remove blog image from Cloudinary:', err.message);
      });
    }

    await existing.deleteOne();

    res.status(200).json({ message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete blog',
      error: err.message,
    });
  }
}

// PUT /api/blogs/reorder (admin only)
// Body: { order: [id1, id2, id3, ...] } -- full ordered id list, same
// convention as the gallery reorder endpoint.
async function reorderBlogs(req, res) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({
        message: 'order must be a non-empty array of blog ids',
      });
    }

    const bulkOps = order.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    await Blog.bulkWrite(bulkOps);

    const blogs = await Blog.find().sort({ priority: 1 });
    res.status(200).json({ blogs });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to reorder blogs',
      error: err.message,
    });
  }
}

module.exports = {
  getBlogs,
  
  getBlogBySku,
  addBlog,
  updateBlog,
  deleteBlog,
  reorderBlogs,
};