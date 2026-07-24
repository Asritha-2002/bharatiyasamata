const path = require('path');
const Download = require('../models/Download');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// Builds a safe, Cloudinary-friendly public_id that ends in .pdf, so the
// resulting URL carries a real file extension and browsers download it
// correctly instead of saving a random unrecognized file.
function buildPdfPublicId(originalName) {
  const nameOnly = path.parse(originalName).name; // strips any existing extension
  const safeName = nameOnly
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .slice(0, 80);
  return `${safeName}-${Date.now()}.pdf`;
}

// GET /api/downloads -- public, sorted for display
async function getDownloads(req, res) {
  try {
    const downloads = await Download.find().sort({ priority: 1 });
    res.status(200).json({ downloads });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load downloads',
      error: err.message,
    });
  }
}

async function getDownloadById(req, res) {
  try {
    const download = await Download.findById(req.params.id);
    if (!download) {
      return res.status(404).json({ message: 'Download not found' });
    }
    res.status(200).json({ download });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load download', error: err.message });
  }
}

// POST /api/downloads (admin only)
// multipart/form-data with fields: title, description, priority (optional), pdf (required file)
async function addDownload(req, res) {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A PDF file is required' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'downloads',
      resource_type: 'raw',
      public_id: buildPdfPublicId(req.file.originalname),
    });

    let priority = req.body.priority !== undefined ? Number(req.body.priority) : undefined;
    if (priority === undefined || Number.isNaN(priority)) {
      const last = await Download.findOne().sort({ priority: -1 });
      priority = last ? last.priority + 1 : 0;
    }

    const download = await Download.create({
      title,
      description,
      priority,
      pdfUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      updatedBy: req.userId,
    });

    res.status(201).json({ download });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add download',
      error: err.message,
    });
  }
}

// PUT /api/downloads/:id (admin only)
async function updateDownload(req, res) {
  try {
    const existing = await Download.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Download not found' });
    }

    const { title, description, priority } = req.body;

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (priority !== undefined && !Number.isNaN(Number(priority))) {
      existing.priority = Number(priority);
    }

    if (req.file) {
      const oldPublicId = existing.cloudinaryPublicId;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'downloads',
        resource_type: 'raw',
        public_id: buildPdfPublicId(req.file.originalname),
      });

      existing.pdfUrl = result.secure_url;
      existing.cloudinaryPublicId = result.public_id;

      if (oldPublicId && oldPublicId !== result.public_id) {
        cloudinary.uploader.destroy(oldPublicId, { resource_type: 'raw' }).catch((err) => {
          console.error('Failed to remove old PDF from Cloudinary:', err.message);
        });
      }
    }

    existing.updatedBy = req.userId;
    await existing.save();

    res.status(200).json({ download: existing });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update download',
      error: err.message,
    });
  }
}

// DELETE /api/downloads/:id (admin only)
async function deleteDownload(req, res) {
  try {
    const existing = await Download.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Download not found' });
    }

    if (existing.cloudinaryPublicId) {
      cloudinary.uploader.destroy(existing.cloudinaryPublicId, { resource_type: 'raw' }).catch((err) => {
        console.error('Failed to remove PDF from Cloudinary:', err.message);
      });
    }

    await existing.deleteOne();

    res.status(200).json({ message: 'Download deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete download',
      error: err.message,
    });
  }
}

// PUT /api/downloads/reorder (admin only)
async function reorderDownloads(req, res) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: 'order must be a non-empty array of download ids' });
    }

    const bulkOps = order.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    await Download.bulkWrite(bulkOps);

    const downloads = await Download.find().sort({ priority: 1 });
    res.status(200).json({ downloads });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to reorder downloads',
      error: err.message,
    });
  }
}

module.exports = {
  getDownloads,
  getDownloadById,
  addDownload,
  updateDownload,
  deleteDownload,
  reorderDownloads,
};