
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET 

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // 'Bearer token'

  if (!token) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next(); 
  });
};

module.exports = verifyToken;
