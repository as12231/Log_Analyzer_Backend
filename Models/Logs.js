
const mongoose = require("mongoose");

const LogDataSchema = new mongoose.Schema({
  username: String,
  timestamp: Date,
  level: String,
  message: String,
  raw: String,         
  extra: mongoose.Schema.Types.Mixed, 
  upload_id: {
  type: Number,
  required: true,
}

});

module.exports = mongoose.model("Log_Data", LogDataSchema);