const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Shared with the admin app's backend (../../../admin/server/uploads) so images
// uploaded from either app are visible to both — they read/write the same DB rows.
const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'admin', 'server', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { upload, uploadDir };
