const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalFasts: {
    type: Number,
    default: 0
  },
  longestFast: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Dashboard', DashboardSchema);