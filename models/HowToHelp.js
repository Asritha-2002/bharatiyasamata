const mongoose = require('mongoose');

// Admin-managed "how to help" resources -- title, description, an optional
// PDF file, and any number of external links. Same priority-ordering
// convention as Download/Blog/Appointment.
const linkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const howToHelpSchema = new mongoose.Schema(
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
    },
    cloudinaryPublicId: {
      type: String,
    },
    links: {
      type: [linkSchema],
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

howToHelpSchema.index({ priority: 1 });

module.exports = mongoose.model('HowToHelp', howToHelpSchema);