const mongoose = require('mongoose');

const JourneySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fastId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fast',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  targetHours: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  hoursFasted: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  }
}, { timestamps: true });

module.exports = mongoose.model('Journey', JourneySchema);