const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  session_id: String,
  question: String,
  answer: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
