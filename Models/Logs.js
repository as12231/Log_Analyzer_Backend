const mongoose = require("mongoose");

const LogDataSchema = new mongoose.Schema({
  username: String,
  timestamp: Date,
  level: String,
  message: String,
  raw: String,           // raw line (for unmatched patterns)
  extra: mongoose.Schema.Types.Mixed, // additional fields like IP, module, etc.

});

module.exports = mongoose.model("Log_Data", LogDataSchema);