const mongoose = require('mongoose');

// Only one banner document is ever expected to exist. We enforce that in
// the controller (find-then-create-or-update) rather than a unique index,
// since there's nothing meaningful to make "unique" on a singleton.
const bannerSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
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

module.exports = mongoose.model('Banner', bannerSchema);