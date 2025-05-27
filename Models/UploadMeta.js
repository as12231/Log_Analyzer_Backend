const mongoose = require('mongoose');

const UploadMetaSchema = new mongoose.Schema({
  username: String,
  upload_id: Number,
  created_at: { type: Date, default: Date.now },
  original_filename: String, // optional if you want to track file name
});

module.exports = mongoose.model("UploadMeta", UploadMetaSchema);
