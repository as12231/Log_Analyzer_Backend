const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Log = require('../Models/Logs');
const UserUploadStats = require("../Models/UserUploadStats");
const FileHash = require("../Models/FileHash"); // For file hash checks
const fs = require("fs");
const crypto = require('crypto');
const readline = require('readline');
const axios = require('axios');
const multer = require('multer');

const signup = async (req, res) => {
  try {
    const { name, email, password, phone, age } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const newUser = new User({ name, email, password, phone, age });
    await newUser.save();

    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password are required' });
    }

    const user = await User.findOne({ name });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



// 🔧 Helper to call Python LLM
function callAskLLM(prompt) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", ["llm_call.py", prompt], {
      env: {
        ...process.env,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
      },
    });

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python error: ${errorOutput}`));
      }
      resolve(output);
    });
  });
}

const uploadLogFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const username = req.body.username || "anonymous";

    // ✅ 1. Calculate file hash to prevent duplicates
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

    const alreadyUploaded = await FileHash.findOne({ hash: fileHash });
    if (alreadyUploaded) {
      fs.unlinkSync(filePath);
      return res.status(409).json({
        success: false,
        message: "Duplicate file detected. Log file was already uploaded.",
      });
    }

    // ✅ 2. Read file lines and deduplicate
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    const logs = [];
    const seen = new Set();
    for await (const line of rl) {
      const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+)\s+(.*)$/;
      const match = line.match(regex);
      if (match) {
        const [_, timestamp, level, message] = match;
        const key = `${timestamp}|${level}|${message}`;
        if (!seen.has(key)) {
          seen.add(key);
          logs.push({
            timestamp: new Date(timestamp),
            level,
            message,
          });
        }
      }
    }

    // ✅ 3. Create dynamic prompt for LLM
    const logSample = logs.slice(0, 300).map(log =>
      `[${log.timestamp.toISOString()}] ${log.level}: ${log.message}`
    ).join("\n");

    const llmPrompt = `
You are an AI system that analyzes system logs and extracts 5 key insights in JSON format.
Return only the JSON object (no explanation or extra text).
The format should be:

{
  "frequentErrorTypes": ["ErrorType1", "ErrorType2", ...],
  "mostActiveTimeRange": "HH:MM-HH:MM",
  "logLevelDistribution": {
    "INFO": count,
    "WARN": count,
    "ERROR": count
  },
  "commonMessages": ["Message1", "Message2", ...],
  "recommendations": ["Action1", "Action2", ...]
}

Now analyze the logs below and return the JSON object:

${logSample.substring(0, 6000)}
`;

    // ✅ 4. Call Python LLM
    let structuredInsights = {};
    try {
      const llmOutput = await callAskLLM(llmPrompt.trim());
      try {
        structuredInsights = JSON.parse(llmOutput);
      } catch (jsonErr) {
        console.warn("Invalid JSON from LLM:", llmOutput);
        structuredInsights = {
          error: "LLM response is not valid JSON",
          rawResponse: llmOutput,
          fallback: true,
        };
      }
    } catch (err) {
      console.warn("LLM Insight generation failed:", err.message);
      structuredInsights = {
        error: "LLM failed to generate structured insights",
        fallback: true,
      };
    }

    // ✅ 5. Save logs and file hash
    if (logs.length > 0) await Log.insertMany(logs);
    await FileHash.create({ hash: fileHash });

    // ✅ 6. Update or create user stats
    let userStats = await UserUploadStats.findOne({ username });
    if (!userStats) {
      userStats = new UserUploadStats({
        username,
        uploadCount: 1,
        totalLineCount: logs.length,
        createdAt: new Date(),
      });
    } else {
      userStats.uploadCount += 1;
      userStats.totalLineCount += logs.length;
      userStats.createdAt = new Date();
    }
    await userStats.save();

    // ✅ 7. Delete uploaded file
    fs.unlinkSync(filePath);

    // ✅ 8. Return final response
    res.status(201).json({
      success: true,
      message: "Log file processed and analyzed",
      count: logs.length,
      uploadCount: userStats.uploadCount,
      totalLineCount: userStats.totalLineCount,
      structuredInsights,
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Upload and processing failed" });
  }
};

const { spawn } = require('child_process');

const askLLM = (req, res) => {
  const prompt = req.query.prompt || "I am Nani what is you name";

  const pythonProcess = spawn('python3', ['llm_call.py', prompt], {
    env: {
      ...process.env,
      GROQ_API_KEY: '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',
    },
  });

  let output = "";
  let errorOutput = "";

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('Python error:', errorOutput);
      return res.status(500).send("Python script error: " + errorOutput);
    }
    res.send(output);
  });
};
module.exports = {
  signup,
  login,
  uploadLogFile,
  askLLM,
};
