const GalleryImage = require('../models/GalleryImage');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// GET /api/gallery -- public, sorted for display
async function getGallery(req, res) {
  try {
    const images = await GalleryImage.find().sort({ priority: 1 });
    res.status(200).json({ images });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load gallery',
      error: err.message,
    });
  }
}

// POST /api/gallery (admin only) -- adds a new image to the end of the list
async function addGalleryImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided. Attach it under the "image" field.',
      });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'gallery',
    });

    // New image goes to the back of the queue -- one more than whatever the
    // current highest priority is.
    const last = await GalleryImage.findOne().sort({ priority: -1 });
    const nextPriority = last ? last.priority + 1 : 0;

    const image = await GalleryImage.create({
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      caption: req.body.caption || '',
      priority: nextPriority,
      updatedBy: req.userId,
    });

    res.status(201).json({ image });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add gallery image',
      error: err.message,
    });
  }
}

// PUT /api/gallery/:id (admin only) -- replace the image file and/or caption.
// Priority is intentionally NOT editable here; use /reorder for that so we
// never end up with two images sharing (or skipping) a priority by accident.
async function updateGalleryImage(req, res) {
  try {
    const existing = await GalleryImage.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }

    if (req.body.caption !== undefined) {
      existing.caption = req.body.caption;
    }

    if (req.file) {
      const oldPublicId = existing.cloudinaryPublicId;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'gallery',
      });

      existing.imageUrl = result.secure_url;
      existing.cloudinaryPublicId = result.public_id;

      if (oldPublicId && oldPublicId !== result.public_id) {
        cloudinary.uploader.destroy(oldPublicId).catch((err) => {
          console.error('Failed to remove old gallery asset from Cloudinary:', err.message);
        });
      }
    }

    existing.updatedBy = req.userId;
    await existing.save();

    res.status(200).json({ image: existing });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update gallery image',
      error: err.message,
    });
  }
}

// DELETE /api/gallery/:id (admin only)
async function deleteGalleryImage(req, res) {
  try {
    const existing = await GalleryImage.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }

    await cloudinary.uploader.destroy(existing.cloudinaryPublicId).catch((err) => {
      console.error('Failed to remove gallery asset from Cloudinary:', err.message);
    });

    await existing.deleteOne();

    // Close the priority gap so remaining items stay contiguous (0,1,2,...).
    await GalleryImage.updateMany(
      { priority: { $gt: existing.priority } },
      { $inc: { priority: -1 } }
    );

    res.status(200).json({ message: 'Gallery image deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete gallery image',
      error: err.message,
    });
  }
}

// PUT /api/gallery/reorder (admin only)
// Body: { order: [id1, id2, id3, ...] } -- the FULL list of image ids in the
// desired display order. Index in the array becomes the new priority.
async function reorderGallery(req, res) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({
        message: 'order must be a non-empty array of gallery image ids',
      });
    }

    const bulkOps = order.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    await GalleryImage.bulkWrite(bulkOps);

    const images = await GalleryImage.find().sort({ priority: 1 });
    res.status(200).json({ images });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to reorder gallery',
      error: err.message,
    });
  }
}

module.exports = {
  getGallery,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  reorderGallery,
};