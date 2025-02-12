const mongoose = require('mongoose');
const Fast = require('../models/Fast');
const User = require('../models/User');
const { isValidDate } = require('../utils/validation');

// Constants
const STREAK_RESET_HOURS = 48;
const MAX_FASTING_HOURS = 168; // 7 days
const MIN_FASTING_HOURS = 1;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Get fasting tips based on elapsed hours
 * @param {number} hours - Elapsed fasting hours
 * @returns {string} Appropriate fasting tip
 */
const getFastingTips = (hours) => {
  const tips = {
    12: "Stay hydrated and try to keep busy to distract from hunger.",
    16: "Your body is entering ketosis. Stay hydrated and consider light exercise.",
    24: "You're in deep ketosis. Listen to your body and break the fast if you feel unwell.",
    default: "Extended fasting requires careful monitoring. Consider consulting a healthcare professional."
  };

  for (const [threshold, tip] of Object.entries(tips)) {
    if (hours <= parseInt(threshold)) return tip;
  }
  return tips.default;
};

/**
 * Update user achievements based on completed fast
 * @param {Object} user - User document
 * @param {Date} lastFastEndTime - End time of previous fast
 * @returns {Promise} Updated user document
 */
const updateUserAchievements = async (user, lastFastEndTime) => {
  const now = new Date();
  
  // Update streak
  if (!lastFastEndTime || (now - lastFastEndTime) > STREAK_RESET_HOURS * 60 * 60 * 1000) {
    user.streak = 1;
  } else {
    user.streak += 1;
  }

  // Award badges
  if (user.streak % 7 === 0 && !user.badges.includes('Weekly Warrior')) {
    user.badges.push('Weekly Warrior');
  }

  return user.save();
};

/**
 * Controller methods for managing fasting sessions
 */
const FastingController = {
  /**
   * Start a new fasting session
   */
  async startFast(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { targetHours, startTime } = req.body;
      const userId = req.user.id;

      // Use findOne with session to ensure consistency
      const existingFast = await Fast.findOne(
        { user: userId, isRunning: true },
        null,
        { session }
      );

      if (existingFast) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'You already have an active fast. Please end it before starting a new one.'
        });
      }

      if (!targetHours || !Number.isFinite(Number(targetHours)) || 
          targetHours < MIN_FASTING_HOURS || targetHours > MAX_FASTING_HOURS) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Invalid target hours. Please enter a duration between ${MIN_FASTING_HOURS} and ${MAX_FASTING_HOURS} hours.`
        });
      }

      if (!startTime || !isValidDate(new Date(startTime))) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'Invalid start time provided.'
        });
      }

      const startTimeDate = new Date(startTime);
      const endTimeDate = new Date(startTimeDate.getTime() + (targetHours * 60 * 60 * 1000));

      const newFast = await Fast.create([{
        user: userId,
        startTime: startTimeDate,
        endTime: endTimeDate,
        targetHours: Number(targetHours),
        isRunning: true,
        elapsedTime: 0,
        currentStage: 'INITIAL'
      }], { session });

      await session.commitTransaction();
      
      res.status(201).json({
        fast: newFast[0],
        message: 'Fast started successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in startFast:', error);
      res.status(500).json({
        message: 'Server error while starting fast',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * End current fasting session
   */
  async endFast(req, res) {
    try {
      const { fastId } = req.params;
      const { mood, weightEnd, notes } = req.body;
      const userId = req.user.id;

      const fast = await Fast.findOne({ _id: fastId, user: userId });
      if (!fast) {
        return res.status(404).json({ message: 'Fast not found' });
      }
      if (!fast.isRunning) {
        return res.status(400).json({ message: 'Fast is already completed' });
      }

      // Update fast details
      const now = new Date();
      Object.assign(fast, {
        endTime: now,
        completed: true,
        isRunning: false,
        elapsedTime: Math.max(0, now - fast.startTime),
        ...(mood && { mood }),
        ...(weightEnd && { weightEnd }),
        ...(notes && { notes })
      });
      await fast.save();

      // Update user achievements
      const user = await User.findById(userId);
      const lastCompletedFast = await Fast.findOne({
        user: userId,
        completed: true,
        _id: { $ne: fast._id }
      }).sort({ endTime: -1 });

      await updateUserAchievements(user, lastCompletedFast?.endTime);

      res.json({
        fast,
        user: {
          streak: user.streak,
          badges: user.badges
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error ending fast',
        error: error.message
      });
    }
  },

  /**
   * Get current active fasting session
   */
  async getCurrentFast(req, res) {
    try {
      const userId = req.user.id;
      const currentFast = await Fast.findOne({ user: userId, isRunning: true });

      if (!currentFast) {
        return res.status(404).json({ message: 'No active fast found' });
      }

      const now = new Date();
      const elapsedTime = Math.max(0, now - currentFast.startTime);

      res.json({
        fast: currentFast,
        elapsedTime,
        remainingTime: currentFast.getRemainingTime(),
        progressPercentage: currentFast.progressPercentage,
        tip: getFastingTips(currentFast.targetHours)
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching current fast',
        error: error.message
      });
    }
  },

  /**
   * Get paginated list of user's fasting sessions
   */
  async getUserFasts(req, res) {
    try {
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE);
      const sortBy = req.query.sortBy || 'startTime';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      const [fasts, total] = await Promise.all([
        Fast.find({ user: userId })
          .sort({ [sortBy]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit),
        Fast.countDocuments({ user: userId })
      ]);

      res.json({
        data: fasts,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFasts: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching fasts',
        error: error.message
      });
    }
  },

  /**
   * Get user's fasting statistics
   */
  async getFastingStats(req, res) {
    try {
      const userId = req.user.id;
      
      const [stats, moodStats] = await Promise.all([
        Fast.aggregate([
          { 
            $match: { 
              user: mongoose.Types.ObjectId(userId), 
              completed: true 
            } 
          },
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
        ]),
        Fast.aggregate([
          { 
            $match: { 
              user: mongoose.Types.ObjectId(userId), 
              completed: true, 
              mood: { $exists: true } 
            } 
          },
          {
            $group: {
              _id: '$mood',
              count: { $sum: 1 }
            }
          }
        ])
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
      res.status(500).json({
        message: 'Error fetching fasting stats',
        error: error.message
      });
    }
  }
};

module.exports = FastingController;