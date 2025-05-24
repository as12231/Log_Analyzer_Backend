const mongoose = require("mongoose");

const FileHashSchema = new mongoose.Schema({
  hash: { type: String, unique: true },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FileHash", FileHashSchema);
