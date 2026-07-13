const Banner = require('../models/Banner');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// GET /api/banner
// Public read -- anyone (including the marketing homepage) can fetch the
// current banner. Returns { banner: null } if none has been set yet.
async function getBanner(req, res) {
  try {
    const banner = await Banner.findOne();
    res.status(200).json({ banner: banner || null });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load banner',
      error: err.message,
    });
  }
}

// POST /api/banner and PUT /api/banner (admin only)
// Since there's only ever one banner, both "create" and "replace" collapse
// into the same upsert.
async function saveBanner(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided. Attach it under the "image" field.',
      });
    }

    const existing = await Banner.findOne();
 console.log(req.file);
    const result = await uploadBufferToCloudinary(req.file.buffer);
   

    if (existing) {
      const oldPublicId = existing.cloudinaryPublicId;

      existing.imageUrl = result.secure_url;
      existing.cloudinaryPublicId = result.public_id;
      existing.updatedBy = req.userId;

      await existing.save();

      // Remove old Cloudinary image (don't fail request if it errors)
      if (oldPublicId && oldPublicId !== result.public_id) {
        cloudinary.uploader
          .destroy(oldPublicId)
          .catch((err) => {
            console.error(
              'Failed to remove old banner asset from Cloudinary:',
              err.message
            );
          });
      }

      return res.status(200).json({
        banner: existing,
      });
    }

    const banner = await Banner.create({
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      updatedBy: req.userId,
    });

    return res.status(201).json({
      banner,
    });
  } catch (err) {
 console.log(JSON.stringify(err, null, 2));
  console.log(err.response);
  console.log(err.http_code);

  res.status(500).json({
    message: 'Failed to save banner',
    error: err.message,
  });
}
}

// DELETE /api/banner (admin only)
async function deleteBanner(req, res) {
  try {
    const existing = await Banner.findOne();

    if (!existing) {
      return res.status(404).json({
        message: 'No banner exists to delete',
      });
    }

    await cloudinary.uploader
      .destroy(existing.cloudinaryPublicId)
      .catch((err) => {
        console.error(
          'Failed to remove banner asset from Cloudinary:',
          err.message
        );
      });

    await existing.deleteOne();

    res.status(200).json({
      message: 'Banner deleted',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete banner',
      error: err.message,
    });
  }
}

module.exports = {
  getBanner,
  saveBanner,
  deleteBanner,
};