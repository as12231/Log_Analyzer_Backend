

const mongoose = require('mongoose');

const UploadMetaSchema = new mongoose.Schema({
  username: String,
  upload_id: Number,
  created_at: { type: Date, default: Date.now },
  original_filename: String,
  log_type: String, 
});

module.exports = mongoose.model("UploadMeta", UploadMetaSchema);
