// models/Dashboard.js
const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Ensure only one dashboard doc per user
      index: true, // Index for faster lookups by user
    },
    totalFasts: {
      type: Number,
      default: 0,
      min: 0, // Ensure non-negative
    },
    longestFast: {
      // Stores duration in hours
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      // Current streak, managed elsewhere but stored here
      type: Number,
      default: 0,
      min: 0,
    },
    badges: [
      {
        // Array of strings representing achievements
        type: String,
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Update lastUpdated field automatically before saving
DashboardSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Add index on lastUpdated for efficient sorting/querying
DashboardSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Dashboard', DashboardSchema);