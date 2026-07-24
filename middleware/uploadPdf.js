const multer = require('multer');

// Same memoryStorage pattern as upload.js -- buffer stays in memory,
// streamed straight to Cloudinary, nothing touches disk.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

function pdfFileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only PDF files are allowed'));
  }
  cb(null, true);
}

const uploadPdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = uploadPdf;