
const express = require('express');
const multer = require('multer');
const { signup, login, uploadLogFile, ask ,generateInsights,chatWithLogs,getLogStats,getLogLevelCounts} = require('../Controllers/AuthController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });


// Post Apis
router.post('/signup', signup);
router.post('/login', login);
router.post('/upload_log', upload.single('logfile'), uploadLogFile);
router.post('/askk', ask);
router.post('/generate_insights', generateInsights);
router.post('/ask', chatWithLogs);



// Get Apis
router.get('/all_insights', getLogStats);
router.get('/hist_insights', getLogLevelCounts);


module.exports = router;


