const Appointment = require('../models/Appointment');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// GET /api/appointments -- public, sorted for display
async function getAppointments(req, res) {
  try {
    const appointments = await Appointment.find().sort({ priority: 1 });
    res.status(200).json({ appointments });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load appointments',
      error: err.message,
    });
  }
}

// GET /api/appointments/:id -- public, single record
async function getAppointmentById(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(200).json({ appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load appointment', error: err.message });
  }
}

// Links arrive as a JSON string in multipart/form-data (since form fields
// are always strings) -- e.g. '[{"label":"Register","url":"https://..."}]'.
// Parses and validates the shape before saving.
function parseLinks(rawLinks) {
  if (rawLinks === undefined) return undefined;
  if (rawLinks === '' || rawLinks === null) return [];

  let parsed;
  try {
    parsed = typeof rawLinks === 'string' ? JSON.parse(rawLinks) : rawLinks;
  } catch {
    throw new Error('links must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('links must be an array');
  }

  for (const link of parsed) {
    if (!link || typeof link.label !== 'string' || typeof link.url !== 'string' || !link.label.trim() || !link.url.trim()) {
      throw new Error('each link must have a non-empty label and url');
    }
  }

  return parsed;
}

// POST /api/appointments (admin only)
// multipart/form-data with fields: title, description, priority (optional),
// links (optional, JSON string), image (optional file)
async function addAppointment(req, res) {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: 'title and description are required',
      });
    }

    let links;
    try {
      links = parseLinks(req.body.links) || [];
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    let imageUrl = null;
    let cloudinaryPublicId = null;
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'appointments',
      });
      imageUrl = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    let priority = req.body.priority !== undefined ? Number(req.body.priority) : undefined;
    if (priority === undefined || Number.isNaN(priority)) {
      const last = await Appointment.findOne().sort({ priority: -1 });
      priority = last ? last.priority + 1 : 0;
    }

    const appointment = await Appointment.create({
      title,
      description,
      priority,
      links,
      imageUrl,
      cloudinaryPublicId,
      updatedBy: req.userId,
    });

    res.status(201).json({ appointment });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add appointment',
      error: err.message,
    });
  }
}

// PUT /api/appointments/:id (admin only)
async function updateAppointment(req, res) {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const { title, description, priority } = req.body;

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (priority !== undefined && !Number.isNaN(Number(priority))) {
      existing.priority = Number(priority);
    }

    if (req.body.links !== undefined) {
      try {
        existing.links = parseLinks(req.body.links);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    if (req.file) {
      const oldPublicId = existing.cloudinaryPublicId;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'appointments',
      });

      existing.imageUrl = result.secure_url;
      existing.cloudinaryPublicId = result.public_id;

      if (oldPublicId && oldPublicId !== result.public_id) {
        cloudinary.uploader.destroy(oldPublicId).catch((err) => {
          console.error('Failed to remove old appointment image from Cloudinary:', err.message);
        });
      }
    }

    existing.updatedBy = req.userId;
    await existing.save();

    res.status(200).json({ appointment: existing });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update appointment',
      error: err.message,
    });
  }
}

// DELETE /api/appointments/:id (admin only)
async function deleteAppointment(req, res) {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (existing.cloudinaryPublicId) {
      cloudinary.uploader.destroy(existing.cloudinaryPublicId).catch((err) => {
        console.error('Failed to remove appointment image from Cloudinary:', err.message);
      });
    }

    await existing.deleteOne();

    res.status(200).json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete appointment',
      error: err.message,
    });
  }
}

// PUT /api/appointments/reorder (admin only)
// Body: { order: [id1, id2, id3, ...] } -- same convention as blogs/gallery.
async function reorderAppointments(req, res) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({
        message: 'order must be a non-empty array of appointment ids',
      });
    }

    const bulkOps = order.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    await Appointment.bulkWrite(bulkOps);

    const appointments = await Appointment.find().sort({ priority: 1 });
    res.status(200).json({ appointments });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to reorder appointments',
      error: err.message,
    });
  }
}

module.exports = {
  getAppointments,
  getAppointmentById,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  reorderAppointments,
};