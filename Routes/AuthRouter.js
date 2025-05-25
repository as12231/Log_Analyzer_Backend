const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { spawn } = require('child_process');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const {
  signup,
  login,
  uploadLogFile,
  askLLM // Make sure this is exported from your AuthController file
} = require('../Controllers/AuthController');
router.get('/ask', askLLM);

const GEMINI_API_KEY = 'AIzaSyBkczDbMsGA0NBfS9irfhfz0loABLUihl4';

// router.get("/ask", llmController.ask);

router.post('/signup', signup);
router.post('/login', login);

// File upload route for log files
router.post('/upload_log', upload.single('logfile'), uploadLogFile);

// Gemini direct API test route
router.get('/sayhi', async (req, res) => {
  const prompt = "hi";

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta1/models/chat-bison-001:generateMessage?key=${GEMINI_API_KEY}`,
      {
        prompt: {
          messages: [
            {
              author: "user",
              content: prompt
            }
          ]
        }
      }
    );

    const reply = response.data.candidates[0].content;
    console.log("Gemini Response:", reply);
    res.send(reply);

  } catch (error) {
    console.error("Error from Gemini:", error.response?.data || error.message);
    res.status(500).send("Gemini API error");
  }
});

module.exports = router;
