const mongoose = require('mongoose');

// Admin-managed appointment info entries -- title, description, an optional
// featured image, and any number of related links (e.g. registration form,
// venue map, external booking page).
const appointmentSchema = new mongoose.Schema(
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
    imageUrl: {
      type: String,
      default: null,
    },
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    // Array of { label, url } pairs -- e.g. { label: "Register here", url: "..." }
    links: {
      type: [
        {
          label: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
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

appointmentSchema.index({ priority: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);