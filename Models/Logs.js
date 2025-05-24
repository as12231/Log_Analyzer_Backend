const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
    timestamp: { type: Date, required: true },
    level: { type: String, required: true },
    message: { type: String, required: true },
  });
  
  module.exports = mongoose.model("Log", LogSchema);