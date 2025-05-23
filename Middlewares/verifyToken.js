// middlewares/verifyToken.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET 

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // 'Bearer token'

  if (!token) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    // Attach the user to the request object
    req.user = decoded;
    next(); // Proceed to the next middleware or route handler
  });
};

module.exports = verifyToken;
