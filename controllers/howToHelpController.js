const path = require('path');
const HowToHelp = require('../models/HowToHelp');
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

// Multipart form-data can't send arrays natively, so links arrive as a JSON
// string in req.body.links (e.g. '[{"label":"Donate","url":"https://..."}]').
// Returns [] on missing/malformed input rather than throwing, since links
// are optional.
function parseLinks(rawLinks) {
  if (!rawLinks) return [];
  try {
    const parsed = JSON.parse(rawLinks);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((link) => link && link.label && link.url)
      .map((link) => ({ label: String(link.label).trim(), url: String(link.url).trim() }));
  } catch (err) {
    return [];
  }
}

// GET /api/how-to-help -- public, sorted for display
async function getHowToHelps(req, res) {
  try {
    const entries = await HowToHelp.find().sort({ priority: 1 });
    res.status(200).json({ entries });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load how-to-help entries',
      error: err.message,
    });
  }
}

async function getHowToHelpById(req, res) {
  try {
    const entry = await HowToHelp.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.status(200).json({ entry });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load entry', error: err.message });
  }
}

// POST /api/how-to-help (admin only)
// multipart/form-data with fields: title, description, priority (optional),
// links (optional JSON string), pdf (optional file)
async function addHowToHelp(req, res) {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }

    let pdfUrl;
    let cloudinaryPublicId;

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'how-to-help',
        resource_type: 'raw',
        public_id: buildPdfPublicId(req.file.originalname),
      });
      pdfUrl = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    const links = parseLinks(req.body.links);

    let priority = req.body.priority !== undefined ? Number(req.body.priority) : undefined;
    if (priority === undefined || Number.isNaN(priority)) {
      const last = await HowToHelp.findOne().sort({ priority: -1 });
      priority = last ? last.priority + 1 : 0;
    }

    const entry = await HowToHelp.create({
      title,
      description,
      priority,
      pdfUrl,
      cloudinaryPublicId,
      links,
      updatedBy: req.userId,
    });

    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add entry',
      error: err.message,
    });
  }
}

// PUT /api/how-to-help/:id (admin only)
async function updateHowToHelp(req, res) {
  try {
    const existing = await HowToHelp.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    const { title, description, priority } = req.body;

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (priority !== undefined && !Number.isNaN(Number(priority))) {
      existing.priority = Number(priority);
    }
    if (req.body.links !== undefined) {
      existing.links = parseLinks(req.body.links);
    }

    if (req.file) {
      const oldPublicId = existing.cloudinaryPublicId;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'how-to-help',
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

    res.status(200).json({ entry: existing });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update entry',
      error: err.message,
    });
  }
}

// DELETE /api/how-to-help/:id (admin only)
async function deleteHowToHelp(req, res) {
  try {
    const existing = await HowToHelp.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    if (existing.cloudinaryPublicId) {
      cloudinary.uploader.destroy(existing.cloudinaryPublicId, { resource_type: 'raw' }).catch((err) => {
        console.error('Failed to remove PDF from Cloudinary:', err.message);
      });
    }

    await existing.deleteOne();

    res.status(200).json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete entry',
      error: err.message,
    });
  }
}

// PUT /api/how-to-help/reorder (admin only)
async function reorderHowToHelps(req, res) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: 'order must be a non-empty array of entry ids' });
    }

    const bulkOps = order.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    await HowToHelp.bulkWrite(bulkOps);

    const entries = await HowToHelp.find().sort({ priority: 1 });
    res.status(200).json({ entries });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to reorder entries',
      error: err.message,
    });
  }
}

module.exports = {
  getHowToHelps,
  getHowToHelpById,
  addHowToHelp,
  updateHowToHelp,
  deleteHowToHelp,
  reorderHowToHelps,
};