

const express = require('express');
const multer = require('multer');
const { signup, login, uploadLogFile, ask } = require('../Controllers/AuthController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/signup', signup);
router.post('/login', login);
router.post('/upload_log', upload.single('logfile'), uploadLogFile);
router.post('/ask', ask);

module.exports = router;