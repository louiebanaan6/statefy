const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { checkImage } = require('../utils/moderation');

const router = express.Router();

const uploadDir = process.env.UPLOADS_PATH || path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_AUDIO = ['.mp3', '.m4a', '.aac', '.wav', '.ogg'];

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB for audio
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [...ALLOWED_IMAGE, ...ALLOWED_AUDIO].includes(ext));
  },
});

// Image upload
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  const filePath = req.file.path;
  const result = await checkImage(filePath);
  if (!result.ok) {
    fs.unlink(filePath, () => {});
    return res.status(400).json({ error: result.reason });
  }
  const host = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${host}/uploads/${req.file.filename}` });
});

// Audio upload
router.post('/audio', authenticate, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio provided' });
  const host = `${req.protocol}://${req.get('host')}`;
  const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
  res.json({ url: `${host}/uploads/${req.file.filename}`, title });
});

module.exports = router;
