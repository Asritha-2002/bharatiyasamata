const mongoose = require('mongoose');

// Admin-managed downloadable resources -- title, description, and a single
// PDF file. Same priority-ordering convention as Blog/Appointment.
const downloadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

downloadSchema.index({ priority: 1 });

module.exports = mongoose.model('Download', downloadSchema);