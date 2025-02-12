const mongoose = require('mongoose');

const fastSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  targetHours: {
    type: Number,
    required: true,
    min: 1,
    max: 168, // Maximum 7 days
    validate: {
      validator: Number.isFinite,
      message: 'Target hours must be a finite number'
    }
  },
  isRunning: {
    type: Boolean,
    default: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  elapsedTime: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStage: {
    type: String,
    enum: ['INITIAL', 'KETOSIS', 'DEEP_KETOSIS', 'EXTENDED'],
    default: 'INITIAL'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
fastSchema.index({ user: 1, isRunning: 1 });
fastSchema.index({ user: 1, completed: 1 });
fastSchema.index({ startTime: -1 });

// Virtual for progress percentage
fastSchema.virtual('progressPercentage').get(function() {
  if (!this.isRunning) return 100;
  const totalDuration = this.endTime - this.startTime;
  const elapsed = Date.now() - this.startTime;
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
});

// Method to calculate remaining time in milliseconds
fastSchema.methods.getRemainingTime = function() {
  if (!this.isRunning) return 0;
  return Math.max(0, this.endTime - Date.now());
};

// Method to update the fasting stage based on elapsed time
fastSchema.methods.updateStage = function() {
  const hoursElapsed = this.elapsedTime / (60 * 60 * 1000);
  
  if (hoursElapsed <= 12) {
    this.currentStage = 'INITIAL';
  } else if (hoursElapsed <= 16) {
    this.currentStage = 'KETOSIS';
  } else if (hoursElapsed <= 24) {
    this.currentStage = 'DEEP_KETOSIS';
  } else {
    this.currentStage = 'EXTENDED';
  }
};

// Pre-save middleware to update stage
fastSchema.pre('save', function(next) {
  if (this.isModified('elapsedTime')) {
    this.updateStage();
  }
  next();
});

// Static method to find active fast for a user
fastSchema.statics.findActiveFast = function(userId) {
  return this.findOne({ user: userId, isRunning: true });
};

// Static method to get user statistics
fastSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { 
      $group: {
        _id: null,
        totalFasts: { $sum: 1 },
        completedFasts: { 
          $sum: { $cond: ['$completed', 1, 0] }
        },
        averageElapsedTime: { $avg: '$elapsedTime' },
        longestFast: { $max: '$elapsedTime' }
      }
    }
  ]);

  return stats[0] || {
    totalFasts: 0,
    completedFasts: 0,
    averageElapsedTime: 0,
    longestFast: 0
  };
};

const Fast = mongoose.model('Fast', fastSchema);

module.exports = Fast;