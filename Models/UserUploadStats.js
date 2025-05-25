const mongoose = require("mongoose");

const userUploadStatsSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  uploadCount: { type: Number, default: 0 },       // total files uploaded
  totalLineCount: { type: Number, default: 0 },    // total lines across all files
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserUploadStats", userUploadStatsSchema);
