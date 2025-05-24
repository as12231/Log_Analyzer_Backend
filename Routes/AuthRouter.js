const express = require('express');
const multer = require('multer');
const router = express.Router();
const { signup, login, uploadLogFile } = require('../Controllers/AuthController');

const upload = multer({ dest: 'uploads/' });

router.get('/h', (req, res) => {
  res.send("Hello, this is the API");
});

router.post('/signup', signup);
router.post('/login', login);

// ✅ Log upload handled here
router.post('/upload_log', upload.single('logfile'), uploadLogFile);

module.exports = router;
