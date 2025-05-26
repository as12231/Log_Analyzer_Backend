const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Log = require('../Models/Logs');
const UserUploadStats = require("../Models/UserUploadStats");
const FileHash = require("../Models/FileHash");
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
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:20.000Z",
      level: 'WARN',
      message: "Configuration file missing 'network.timeout', using default"
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:25.000Z",
      level: 'INFO',
      message: 'Starting network services'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:30.000Z",
      level: 'ERROR',
      message: 'Failed to start DHCP service'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:31:35.000Z",
      level: 'INFO',
      message: 'System started successfully with warnings'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:45:12.000Z",
      level: 'INFO',
      message: "User 'admin' logged in"
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T04:47:02.000Z",
      level: 'INFO',
      message: 'Scheduled backup started'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T05:00:55.000Z",
      level: 'INFO',
      message: 'Scheduled backup completed successfully'
    },
    {
      username: 'Tharun',
      timestamp: "2025-05-26T05:30:00.000Z",
      level: 'WARN',
      message: 'High memory usage detected: 87%'
    }
  ];

  const prompt = `
Given the following array of log entries in JSON format, analyze and return a JSON object with these fields:

- totalLogs: total number of logs
- levelCounts: object with count of each log level (INFO, WARN, ERROR)
- uniqueUsernames: list of unique usernames in the logs
- earliestTimestamp: earliest timestamp in ISO 8601 format
- latestTimestamp: latest timestamp in ISO 8601 format
- topMessages: array of top 3 most frequent messages, each with "message" and "count"

Return ONLY the JSON object with no explanation or extra text.

Log data:
${JSON.stringify(logs, null, 2)}
`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY',
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;

    // Parse the LLM reply as JSON
    let insights;
    try {
      insights = JSON.parse(reply);
    } catch (err) {
      console.error("Failed to parse LLM response as JSON:", err);
      return res.status(500).json({ success: false, message: "Invalid JSON from LLM" });
    }

    // You can now store 'insights' in your database or send as response
    res.status(200).json({ success: true, data: insights });
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
            extra: Object.assign({}, obj, { timestamp: undefined, level: undefined, message: undefined }),
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
    for await (const line of rl) {
      let parsed = { username, raw: line, extra: {} };
      for (const parser of parsers) {
        const match = line.match(parser.regex);
        if (match) {
          const data = parser.handler(match);
          parsed = { username, raw: line, ...data };
          break;
        }
      }
      logs.push(parsed);
    }
    await Log.insertMany(logs);
    res.status(201).json({ success: true, message: 'Log file uploaded successfully', count: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload log file' });
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
module.exports = {
  signup,
  login,
  uploadLogFile,
  ask,
};


