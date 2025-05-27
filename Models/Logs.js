
const mongoose = require("mongoose");

const LogDataSchema = new mongoose.Schema({
  username: String,
  timestamp: Date,
  level: String,
  message: String,
  raw: String,           // raw line (for unmatched patterns)
  extra: mongoose.Schema.Types.Mixed, // additional fields like IP, module, etc.
  upload_id: {
  type: Number,
  required: true,
}

});

module.exports = mongoose.model("Log_Data", LogDataSchema);