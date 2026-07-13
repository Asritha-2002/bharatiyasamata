const mongoose = require('mongoose');

// sku is a unique short code for the blog (used for lookups/URLs), separate
// from the auto-generated _id. priority controls display order like the
// gallery -- lower number shows first. imageUrl/cloudinaryPublicId are
// optional since not every blog post needs a featured image.
const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    cloudinaryPublicId: {
      type: String,
      default: null,
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

blogSchema.index({ priority: 1 });

module.exports = mongoose.model('Blog', blogSchema);