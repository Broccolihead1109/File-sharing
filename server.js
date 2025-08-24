const express = require('express');
const multer  = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(cookieParser());

// Storage setup
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB
});

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// In-memory mapping of userId → files
let userFiles = {};

// Generate or get userId
app.use((req, res, next) => {
  let userId = req.cookies.userId;
  if (!userId) {
    userId = crypto.randomUUID();
    res.cookie('userId', userId, { maxAge: 31536000000 });
  }
  req.userId = userId;
  if (!userFiles[userId]) userFiles[userId] = [];
  next();
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  // Store file info for this user
  userFiles[req.userId].push(req.file.filename);
  res.json({ success: true, filename: req.file.originalname, link: `/files/${req.file.filename}` });
});

// Serve uploaded files (public direct download)
app.get('/files/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Return user's files
app.get('/your-files', (req, res) => {
  const files = userFiles[req.userId].map(filename => ({
    name: filename,
    link: `/files/${filename}`
  }));
  res.json(files);
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
