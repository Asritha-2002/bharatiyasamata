
const multer = require('multer');

// Multer throws synchronously-caught errors that Express treats as regular
// errors -- without this, a bad upload (wrong file type, too large) would
// otherwise bubble up as an unhandled 500 with no useful message.
// Mount this AFTER your routes, e.g.: app.use(handleUploadError);
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 5MB or smaller' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err && err.message && err.message.includes('Only JPG, PNG, and WEBP')) {
    return res.status(400).json({ message: err.message });
  }

  next(err);
}

module.exports = handleUploadError;
