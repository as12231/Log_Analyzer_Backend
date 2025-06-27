const mongoose = require("mongoose");

const userUploadStatsSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  uploadCount: { type: Number, default: 0 },       
  totalLineCount: { type: Number, default: 0 },    
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserUploadStats", userUploadStatsSchema);
