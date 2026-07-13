const mongoose = require('mongoose');

// Unlike Banner, there can be many gallery images, so "priority" is what
// determines display order. Lower priority = shown first. We store it as a
// plain integer and re-normalize it (0,1,2,...) whenever items are reordered
// or one is deleted, so gaps never build up.
const galleryImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
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

galleryImageSchema.index({ priority: 1 });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);