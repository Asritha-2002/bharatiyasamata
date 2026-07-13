
const cloudinary = require('../config/cloudinary.js');

// Cloudinary's upload_stream takes a callback, not a promise -- this wraps it
// so controllers can just `await` it. The buffer is piped directly in,
// nothing is ever written to local disk.
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    uploadStream.end(buffer);
  });
}

module.exports = { uploadBufferToCloudinary };
