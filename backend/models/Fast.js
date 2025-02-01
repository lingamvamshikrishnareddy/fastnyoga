const mongoose = require('mongoose');

const FastSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Each fast must be associated with a user
    },
    startTime: {
      type: Date,
      required: true, // Start time is mandatory
    },
    endTime: {
      type: Date,
      default: null, // Default to null if not completed
    },
    completed: {
      type: Boolean,
      default: false, // Indicates if the fast has been completed
    },
    targetHours: {
      type: Number,
      required: true, // Target hours for fasting are mandatory
      min: [1, 'Target hours must be at least 1 hour.'], // Validate minimum target hours
    },
    elapsedTime: {
      type: Number,
      default: 0, // Elapsed time starts at 0
    },
    isRunning: {
      type: Boolean,
      default: true, // Indicates if the fast is currently active
    },
    hoursFasted: {
      type: Number,
      default: 0,
      min: [0, 'Hours fasted cannot be negative.'], // Validate minimum hours fasted
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters.'], // Allow users to add notes with a character limit
    },
    benefits: {
      type: [String], // Optional field to store observed benefits during the fast
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

// Virtual field to calculate remaining fasting time
FastSchema.virtual('remainingTime').get(function () {
  if (!this.endTime) {
    return Math.max(this.targetHours * 3600 - this.elapsedTime, 0); // Time remaining in seconds
  }
  return 0; // If the fast is completed, remaining time is 0
});

// Middleware to auto-calculate elapsed time and mark completion
FastSchema.pre('save', function (next) {
  if (this.isRunning && this.endTime) {
    const elapsed = (this.endTime.getTime() - this.startTime.getTime()) / 3600000; // Convert to hours
    this.elapsedTime = elapsed;
    if (elapsed >= this.targetHours) {
      this.completed = true;
      this.isRunning = false;
    }
  }
  next();
});

const Fast = mongoose.model('Fast', FastSchema);

module.exports = Fast;
