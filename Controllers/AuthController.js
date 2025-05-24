const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Log = require('../Models/Logs');

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


const fs = require("fs");
const readline = require("readline");

const uploadLogFile = async (req, res) => {
  try {
    const filePath = req.file.path;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    const logs = [];

    for await (const line of rl) {
      const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+)\s+(.*)$/;
      const match = line.match(regex);
      if (match) {
        const [_, timestamp, level, message] = match;
        logs.push({
          timestamp: new Date(timestamp),
          level,
          message,
        });
      }
    }

    await Log.insertMany(logs);

    res.status(201).json({ success: true, message: "Log file uploaded", count: logs.length });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload log file" });
  }
};

// Existing signup or login handlers go here...

module.exports = {
  signup,
  login,
  uploadLogFile, // ✅ Add this export
};
