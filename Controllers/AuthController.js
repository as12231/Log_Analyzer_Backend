const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Log = require('../Models/Logs');
const UserUploadStats = require("../Models/UserUploadStats"); // Stats model


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
    console.log("Signup error:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


const login = async (req, res) => {
  try {
    console.log("Login request body:", req.body);
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password are required' });
    }

    const user = await User.findOne({ name });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log("JWT_SECRET:", process.env.JWT_SECRET);

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
    console.error("Login error:", error.message);
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
const crypto = require("crypto");
const fs = require("fs");
const readline = require("readline");
const FileHash = require("../Models/FileHash");

const uploadLogFile = async (req, res) => {
  try {
    const filePath = req.file.path;
    const username = req.body.username || "anonymous";

    // 1. Read file and generate hash
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

    // 2. Check if file hash already exists
    const alreadyUploaded = await FileHash.findOne({ hash: fileHash });
    if (alreadyUploaded) {
      return res.status(409).json({
        success: false,
        message: "Duplicate file detected. Log file was already uploaded.",
      });
    }
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

    await Log.insertMany(logs);
    await FileHash.create({ hash: fileHash });

    // 6. Update user upload stats (file count + total lines)
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
      userStats.createdAt = new Date(); // update last upload time
    }
    await userStats.save();

    res.status(201).json({
      success: true,
      message: "Log file processed",
      count: logs.length,
      uploadCount: userStats.uploadCount,
      totalLineCount: userStats.totalLineCount,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload log file" });
  }
};

module.exports = { uploadLogFile };




module.exports = {
  signup,
  login,
  uploadLogFile, // ✅ Add this export
};
