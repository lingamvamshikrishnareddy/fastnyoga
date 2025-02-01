const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  totalFasts: Number,
  longestFast: Number,
});

module.exports = mongoose.model('Stats', statsSchema);