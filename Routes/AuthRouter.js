

const express = require('express');
const multer = require('multer');
const { signup, login, uploadLogFile, ask ,generateInsights,chatWithLogs,getLogStats} = require('../Controllers/AuthController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/signup', signup);
router.post('/login', login);
router.post('/upload_log', upload.single('logfile'), uploadLogFile);
router.post('/askk', ask);
router.get('/all_insights', getLogStats);




// API if logs are coming as JSON (use this for LLM input format)
// router.post('/upload_logs_json', uploadLogs);

// Generate LLM Insights and Save Summary
router.post('/generate_insights', generateInsights);

// Chatbot API — ask questions on logs
router.post('/ask', chatWithLogs);



module.exports = router;