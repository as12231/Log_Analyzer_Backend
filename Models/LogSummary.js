const mongoose = require('mongoose');

const logSummarySchema = new mongoose.Schema({
  generatedAt: { type: Date, default: Date.now },
  time_series: Array,
  log_level_distribution: Object,
  top_messages: Array,
  anomalies: Array
});

module.exports = mongoose.model('LogSummary', logSummarySchema);
