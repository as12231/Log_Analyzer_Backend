
const express = require('express');
const multer = require('multer');
const { signup, login, uploadLogFile, ask ,generateInsights,chatWithLogs,getLogStats,getLogLevelCounts,getFileLevelCounts,} = require('../Controllers/AuthController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });


// Post Apis
router.post('/signup', signup);
router.post('/login', login);
router.post('/upload_log', upload.single('logfile'), uploadLogFile);
router.post('/question', ask);
router.post('/generate_insights', generateInsights);
router.post('/ask', chatWithLogs);

// Get Apis
router.get('/insights', getLogStats);
router.get('/file_insights', getFileLevelCounts);
router.get('/all_insights', getLogLevelCounts);

module.exports = router;


