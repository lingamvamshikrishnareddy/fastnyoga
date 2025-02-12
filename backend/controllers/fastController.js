const Fast = require('../models/Fast');
const User = require('../models/User');
const { isValidDate } = require('../utils/validation');

// Helper function to get fasting tips based on hours
const getFastingTips = (hours) => {
  if (hours <= 12) {
    return "Stay hydrated and try to keep busy to distract from hunger.";
  } else if (hours <= 16) {
    return "Your body is entering ketosis. Stay hydrated and consider light exercise.";
  } else if (hours <= 24) {
    return "You're in deep ketosis. Listen to your body and break the fast if you feel unwell.";
  } else {
    return "Extended fasting requires careful monitoring. Consider consulting a healthcare professional.";
  }
};

exports.startFast = async (req, res) => {
  try {
    const { targetHours, startTime, weightStart } = req.body;
    const userId = req.user.id;

    // Enhanced input validation
    if (!targetHours || !Number.isFinite(targetHours) || targetHours <= 0 || targetHours > 168) {
      return res.status(400).json({
        message: 'Invalid target hours. Please enter a duration between 1 and 168 hours.'
      });
    }

    if (!startTime || !isValidDate(new Date(startTime))) {
      return res.status(400).json({
        message: 'Invalid start time provided.'
      });
    }

    // Check for existing active fast
    const existingFast = await Fast.findOne({
      user: userId,
      isRunning: true
    });

    if (existingFast) {
      return res.status(400).json({
        message: 'You already have an active fast. Please end it before starting a new one.'
      });
    }

    const parsedStartTime = new Date(startTime);
    
    const newFast = new Fast({
      user: userId,
      startTime: parsedStartTime,
      targetHours,
      weightStart,
      isRunning: true,
      elapsedTime: 0,
      currentStage: 'INITIAL'
    });

    await newFast.save();

    res.status(201).json({
      fast: newFast,
      message: 'Fast started successfully',
      tip: getFastingTips(targetHours)
    });

  } catch (error) {
    console.error('Error in startFast:', error);
    res.status(500).json({
      message: 'Server error while starting fast',
      error: error.message
    });
  }
};

exports.endFast = async (req, res) => {
  try {
    const { fastId } = req.params;
    const { mood, weightEnd, notes } = req.body;
    const userId = req.user.id;

    const fast = await Fast.findOne({
      _id: fastId,
      user: userId
    });

    if (!fast) {
      return res.status(404).json({ message: 'Fast not found' });
    }

    if (!fast.isRunning) {
      return res.status(400).json({ message: 'Fast is already completed' });
    }

    const now = new Date();
    fast.endTime = now;
    fast.completed = true;
    fast.isRunning = false;
    fast.elapsedTime = Math.max(0, now.getTime() - fast.startTime.getTime());
    
    if (mood) fast.mood = mood;
    if (weightEnd) fast.weightEnd = weightEnd;
    if (notes) fast.notes = notes;

    await fast.save();

    // Update user stats and streaks
    const user = await User.findById(userId);
    const lastCompletedFast = await Fast.findOne({
      user: userId,
      completed: true,
      _id: { $ne: fast._id }
    }).sort({ endTime: -1 });

    // Reset streak if last fast was more than 48 hours ago
    if (!lastCompletedFast || (now.getTime() - lastCompletedFast.endTime.getTime()) > 48 * 60 * 60 * 1000) {
      user.streak = 1;
    } else {
      user.streak += 1;
    }

    // Award badges based on achievements
    if (user.streak % 7 === 0 && !user.badges.includes('Weekly Warrior')) {
      user.badges.push('Weekly Warrior');
    }

    await user.save();

    res.json({
      fast,
      user: {
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error ending fast', error: error.message });
  }
};

exports.getCurrentFast = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentFast = await Fast.findOne({ user: userId, isRunning: true });

    if (!currentFast) {
      return res.status(404).json({ message: 'No active fast found' });
    }

    const now = new Date();
    const elapsedTime = Math.max(0, now.getTime() - currentFast.startTime.getTime());
    const remainingTime = currentFast.getRemainingTime();
    const progressPercentage = currentFast.progressPercentage;

    res.json({
      fast: currentFast,
      elapsedTime,
      remainingTime,
      progressPercentage,
      tip: getFastingTips(currentFast.targetHours)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current fast', error: error.message });
  }
};

exports.getUserFasts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'startTime';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const fasts = await Fast.find({ user: userId })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Fast.countDocuments({ user: userId });

    res.json({
      data: fasts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFasts: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fasts', error: error.message });
  }
};

exports.getFastingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Fast.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), completed: true } },
      {
        $group: {
          _id: null,
          totalFasts: { $sum: 1 },
          completedFasts: { $sum: 1 },
          averageElapsedTime: { $avg: '$elapsedTime' },
          longestFast: { $max: '$elapsedTime' },
          totalFastingHours: {
            $sum: { $divide: ['$elapsedTime', 3600000] }
          },
          averageWeightLoss: {
            $avg: { $subtract: ['$weightEnd', '$weightStart'] }
          }
        }
      }
    ]);

    // Get mood distribution
    const moodStats = await Fast.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), completed: true, mood: { $exists: true } } },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statistics: stats[0] || {
        totalFasts: 0,
        completedFasts: 0,
        averageElapsedTime: 0,
        longestFast: 0,
        totalFastingHours: 0,
        averageWeightLoss: 0
      },
      moodDistribution: moodStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fasting stats', error: error.message });
  }
};
