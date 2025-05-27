

const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const LogSummary = require('../Models/LogSummary');
const Log = require('../Models/Logs');
const ChatSession = require('../Models/ChatSession');
const UserUploadStats = require("../Models/UserUploadStats");
const FileHash = require("../Models/FileHash");
const fs = require("fs");
const crypto = require('crypto');
const readline = require('readline');
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const UploadMeta = require('../Models/UploadMeta');

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
const ask = async (req, res) => {
  const logs = [
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:15.000Z",
      level: 'INFO',
      message: 'System boot initiated'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:17.000Z",
      level: 'INFO',
      message: 'Loading configuration from /etc/sys/config.ini'
    },
  ];  // your logs array

  const prompt = `
this is the data [
  {
    "username": "Tharun",
    "timestamp": "2025-05-26T02:10:00.000Z",
    "level": "INFO",
    "message": "System started"
  },
  {
    "username": "Tharun",
    "timestamp": "2025-05-26T02:15:30.000Z",
    "level": "ERROR",
    "message": "Disk read failure on /dev/sda1"
  },
  {
    "username": "Tharun",
    "timestamp": "2025-05-26T02:16:45.000Z",
    "level": "WARN",
    "message": "System running in degraded mode"
  },
  {
    "username": "Tharun",
    "timestamp": "2025-05-26T02:18:20.000Z",
    "level": "INFO",
    "message": "Attempting disk recovery"
  },
  {
    "username": "Tharun",
    "timestamp": "2025-05-26T02:20:00.000Z",
    "level": "INFO",
    "message": "Disk recovery successful"
  }
]


{
  "time_series": [{"timestamp": "...", "error_count": 0, "warning_count": 0, "info_count": 0}],
  "log_level_distribution": {"INFO": 0, "DEBUG": 0, "ERROR": 0, "WARNING": 0},
  "top_messages": [{"message": "string", "count": 0}],
  "anomalies": [{"timestamp": "...", "description": "string"}]
}
Log data:
${JSON.stringify(logs, null, 2)}
`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBkczDbMsGA0NBfS9irfhfz0loABLUihl4',
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;

    res.status(200).json({ success: true, data: reply });
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Gemini API error' });
  }
};

function parseApacheDate(dateStr) {
  const [datePart] = dateStr.split(' ');
  const [day, monStr, yearAndTime] = datePart.split('/');
  const [year, hour, minute, second] = yearAndTime.split(/[:]/);
  const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const month = monthMap[monStr];
  return new Date(Date.UTC(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
}
const uploadLogFile = async (req, res) => {
  try {
    const filePath = req.file.path;
    const username = 'Tharun';

    const lastLog = await Log.findOne({ upload_id: { $exists: true } }).sort({ upload_id: -1 }).exec();
    const newUploadId = typeof lastLog?.upload_id === 'number' ? lastLog.upload_id + 1 : 0;
    let logType = 'unknown';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.json') {
      logType = 'json';
    } else if (ext === '.log') {
      try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8').toLowerCase();
        if (fileContent.includes('systemd') || fileContent.includes('kernel') || fileContent.includes('cron')) {
          logType = 'system';
        } else if (fileContent.includes('connection received') || fileContent.includes('postgres') || fileContent.includes('mysql')) {
          logType = 'database';
        } else if (fileContent.includes('get') || fileContent.includes('post') || fileContent.includes('http/1.1')) {
          logType = 'web_access';
        } else if ((fileContent.includes('error') && fileContent.includes('stack')) || fileContent.includes('trace')) {
          logType = 'web_error';
        } else if (fileContent.includes('info') || fileContent.includes('warn') || fileContent.includes('debug')) {
          logType = 'application';
        } else {
          logType = 'generic_log';
        }
      } catch (err) {
        console.error("Error reading file content:", err);
        logType = 'unknown';
      }
    }

    const uploadMeta = new UploadMeta({
      username,
      upload_id: newUploadId,
      original_filename: req.file.originalname,
      log_type: logType,
    });

    await uploadMeta.save();

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    const logs = [];

    const parsers = [
      {
        regex: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(\d{3}) - (\w+) - (.*)$/,
        handler: (m) => ({
          timestamp: new Date(`${m[1]}.${m[2]}`),
          level: m[3],
          message: m[4],
          extra: {},
        }),
      },
      {
        regex: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+)\s+(.*)$/,
        handler: (m) => ({
          timestamp: new Date(m[1]),
          level: m[2],
          message: m[3],
          extra: {},
        }),
      },
      {
        regex: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (\w+) - (.*)$/,
        handler: (m) => ({
          timestamp: new Date(m[1]),
          level: m[2],
          message: m[3],
          extra: {},
        }),
      },
      {
        regex: /^\[(\w+)\] \[(.*?)\] (.*)$/,
        handler: (m) => ({
          timestamp: new Date(m[2]),
          level: m[1],
          message: m[3],
          extra: {},
        }),
      },
      {
        regex: /^\{.*"timestamp":.*"level":.*"message":.*\}$/,
        handler: (m) => {
          const obj = JSON.parse(m[0]);
          return {
            timestamp: new Date(obj.timestamp),
            level: obj.level,
            message: obj.message,
            extra: Object.fromEntries(
              Object.entries(obj).filter(([k]) => !['timestamp', 'level', 'message'].includes(k))
            ),
          };
        },
      },
      {
        regex: /^[A-Za-z]{3} [ \d]{1,2} \d{2}:\d{2}:\d{2} [\w\-]+ .*/,
        handler: (m) => ({
          timestamp: new Date(),
          level: 'INFO',
          message: m[0],
          extra: {},
        }),
      },
      {
        regex: /^(\d{1,3}(?:\.\d{1,3}){3}) - - \[(.*?)\] "(.*?)" (\d{3}) (\d+)(?: .*?)?$/,
        handler: (m) => ({
          timestamp: parseApacheDate(m[2]),
          level: 'INFO',
          message: m[3],
          extra: {
            ip: m[1],
            status: m[4],
            size: m[5],
          },
        }),
      },
      {
        regex: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.*)$/,
        handler: (m) => ({
          timestamp: new Date(m[1]),
          level: m[2],
          message: m[3],
          extra: {},
        }),
      },
    ];
    // your parsers array remains the same...

    for await (const line of rl) {
      let parsed = { username, raw: line, extra: {}, upload_id: newUploadId };
      for (const parser of parsers) {
        const match = line.match(parser.regex);
        if (match) {
          const data = parser.handler(match);
          parsed = { username, raw: line, upload_id: newUploadId, ...data };
          break;
        }
      }
      logs.push(parsed);
    }

    await Log.insertMany(logs);

    // ✅ Prepare prompt for Gemini
    const prompt = `
Here's a collection of log entries in JSON format:
${JSON.stringify(logs.slice(0, 100), null, 2)}  // Keep the prompt size reasonable

Please summarize the log data, focusing on:
- Key events and patterns give only 50 words
- Error messages and warnings give only 50 words
- Security-related incidents give only 50 words
- Any notable system behaviors give only 50 words
just give summary dont give the tarun,filname,upload ok and dontr give word count
`;

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const answer = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';

    // ✅ Send to frontend
    res.status(201).json({
      success: true,
      message: 'Log file uploaded successfully',
      count: logs.length,
      upload_id: newUploadId,
      summary: answer,
    });

  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload log file',
    });
  }
};

const { spawn } = require('child_process');

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

const generateInsights = async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ timestamp: -1 }).limit(50); // last 50 logs

    const prompt = `
Analyze the following log data and return JSON with:
- time_series (timestamps with error, warning, info count)
- log_level_distribution
- top_messages
- anomalies

Logs:
${JSON.stringify(logs, null, 2)}

Respond in:
{
  "time_series": [...],
  "log_level_distribution": {...},
  "top_messages": [...],
  "anomalies": [...]
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    let summaryText = response.data.candidates[0].content.parts[0].text;

    // Clean markdown code fences before parsing
    summaryText = summaryText.replace(/```json|```/g, '').trim();

    const summaryJson = JSON.parse(summaryText);
    const savedSummary = await LogSummary.create(summaryJson);

    res.status(200).json({ success: true, summary: savedSummary });
  } catch (error) {
    console.error("Generate Insights Error:", error.response?.data || error);
    res.status(500).json({ success: false, message: 'Error generating insights' });
  }
};


const chatWithLogs = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    const lastUpload = await Log.findOne().sort({ upload_id: -1 });
    if (!lastUpload) {
      return res.status(404).json({ success: false, message: 'No logs found' });
    }
    const latestUploadId = lastUpload.upload_id;
    const logs = await Log.find({ upload_id: latestUploadId }).sort({ timestamp: 1 });
    const logsData = logs.map(log => ({
      id: log._id,
      timestamp: log.timestamp,
      message: log.message,
    }));
    const prompt = `
Given this log data:
${JSON.stringify(logsData, null, 2)}

Answer the question: ${question}
`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { headers: { 'Content-Type': 'application/json' },
      timeout: 15000, }
    );
    const candidates = response.data?.candidates;
    const answer = candidates && candidates.length > 0
      ? candidates[0].content.parts[0].text
      : 'No answer generated';
      const session_id = uuidv4();

    await ChatSession.create({ session_id, question, answer });

    res.status(200).json({ success: true, answer });
  } catch (error) {
    console.error("Chat Error:", error.response?.data || error);
    res.status(500).json({ success: false, message: 'Chat processing failed' });
  }
};


const getLogStats = async (req, res) => {
  try {
    const totalRows = await Log.countDocuments();
    
    const uploadFolderPath = path.join(__dirname, '../uploads'); 
    let totalFiles = 0;
    
    if (fs.existsSync(uploadFolderPath)) {
      const files = fs.readdirSync(uploadFolderPath);
      totalFiles = files.filter(file => {
        const filePath = path.join(uploadFolderPath, file);
        return fs.statSync(filePath).isFile();
      }).length;
    }
    
    const uniqueUploads = await Log.distinct('upload_id');
    const totalUploads = uniqueUploads.length;
    
    res.json({
      success: true,
      data: {
        totalRows,
        totalFiles,
        totalUploads
      },
      message: "Statistics retrieved successfully"
    });
    
  } catch (error) {
    console.error('Error getting log statistics:', error);
    res.status(500).json({
      success: false,
      message: "Error retrieving statistics",
      error: error.message
    });
  }
};
const getLogLevelCounts = async (req, res) => {
  try {
    const regexPatterns = {
      dbConnectionErrors: /db connection|database connection/i,
      resourceErrors: /resource not available/i,
      fileNotFoundErrors: /file not found/i,
      operationCompleted: /operation completed/i,
      timeout: /timeout/i,
      exception: /exception/i,
      failedToLoadModule: /failed to load/i,
      connection: /connection/i,
    };

    const levelAggregation = Log.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$level', 'UNKNOWN'] },
          count: { $sum: 1 },
        },
      },
    ]);

    const logTypeAggregation = UploadMeta.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$log_type', 'UNKNOWN'] },
          count: { $sum: 1 },
        },
      },
    ]);

    // Step 3: Fetch only required fields for keyword matching (limit results if needed)
    const messages = await Log.find({}, { message: 1 }).lean();

    // Step 4: Count keyword matches in JS (much faster)
    const keywordCounts = {};
    for (const [key, pattern] of Object.entries(regexPatterns)) {
      keywordCounts[key] = messages.reduce(
        (acc, log) => acc + (pattern.test(log.message || '') ? 1 : 0),
        0
      );
    }

    // Await aggregations
    const [levelResult, typeResult] = await Promise.all([
      levelAggregation,
      logTypeAggregation,
    ]);

    // Convert results to objects
    const levelCounts = {};
    levelResult.forEach(item => {
      levelCounts[item._id] = item.count;
    });

    const logTypeCounts = {};
    typeResult.forEach(item => {
      logTypeCounts[item._id] = item.count;
    });

    res.json({
      success: true,
      levelCounts,
      logTypeCounts,
      keywordCounts,
    });
  } catch (error) {
    console.error('Error in getLogLevelCounts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch log stats' });
  }
};



module.exports = {
  signup,
  login,
  uploadLogFile,
  ask,generateInsights,chatWithLogs,getLogStats,getLogLevelCounts
};

