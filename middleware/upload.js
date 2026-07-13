
const multer = require('multer');

// memoryStorage keeps the file as a Buffer on req.file.buffer instead of
// writing anything to disk -- exactly what we want since the buffer gets
// streamed straight to Cloudinary.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function imageFileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = upload;

