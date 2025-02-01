const Fast = require('../models/Fast');
const User = require('../models/User');

// Helper function to get fasting tips based on hours
const getFastingTips = (hours) => {
  if (hours <= 12) {
    return "Stay hydrated and try to keep busy to distract from hunger.";
  } else if (hours <= 16) {
    return "Your body is entering ketosis. Stay hydrated and consider light exercise.";
  } else if (hours <= 24) {
    return "You're in deep ketosis. Listen to your body and break the fast if you feel unwell.";
  } else {
    return "Extended fasting can be challenging. Consult with a healthcare professional for safety.";
  }
};

// Function to start a new fast
exports.startFast = async (req, res) => {
  try {
    const { targetHours } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!targetHours || targetHours <= 0 || targetHours > 168) { // Max 1 week
      return res.status(400).json({ message: 'Invalid target hours' });
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + targetHours * 60 * 60 * 1000);

    // Check for existing active fast
    const existingFast = await Fast.findOne({ user: userId, isRunning: true });
    if (existingFast) {
      return res.status(400).json({ message: 'You already have an active fast' });
    }

    const newFast = new Fast({
      user: userId,
      startTime: now,
      endTime: endTime,
      targetHours,
      isRunning: true,
      elapsedTime: 0,
    });

    await newFast.save();

    const tip = getFastingTips(targetHours);

    res.status(201).json({ fast: newFast, tip });
  } catch (error) {
    res.status(500).json({ message: 'Error starting fast', error: error.message });
  }
};

// Function to end an existing fast
exports.endFast = async (req, res) => {
  try {
    const { fastId } = req.params;
    const userId = req.user.id;

    const fast = await Fast.findById(fastId);

    if (!fast) {
      return res.status(404).json({ message: 'Fast not found' });
    }

    if (fast.user.toString() !== userId) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    if (!fast.isRunning) {
      return res.status(400).json({ message: 'Fast is already completed' });
    }

    const now = new Date();
    fast.endTime = now;
    fast.completed = true;
    fast.isRunning = false;
    fast.elapsedTime = Math.max(0, now.getTime() - fast.startTime.getTime());

    await fast.save();

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

    if (user.streak % 7 === 0 && !user.badges.includes('Weekly Warrior')) {
      user.badges.push('Weekly Warrior');
    }

    await user.save();

    res.json({ fast, user: { streak: user.streak, badges: user.badges } });
  } catch (error) {
    res.status(500).json({ message: 'Error ending fast', error: error.message });
  }
};

// Function to fetch the current active fast for the user
exports.getCurrentFast = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentFast = await Fast.findOne({ user: userId, isRunning: true });

    if (!currentFast) {
      return res.status(404).json({ message: 'No active fast found' });
    }

    const now = new Date();
    const elapsedTime = Math.max(0, now.getTime() - currentFast.startTime.getTime());
    const remainingTime = Math.max(0, currentFast.endTime.getTime() - now.getTime());

    const tip = getFastingTips(currentFast.targetHours);

    res.json({
      fast: currentFast,
      elapsedTime,
      remainingTime,
      tip
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current fast', error: error.message });
  }
};

// Helper function to validate date
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

// Helper function to check for active fasts
const getActiveFast = async (userId) => {
  return await Fast.findOne({ user: userId, isRunning: true });
};



// Function to update the elapsed time of an ongoing fast
exports.updateFast = async (req, res) => {
  try {
    const { fastId } = req.params;
    const { elapsedTime } = req.body;
    const userId = req.user.id;

    if (typeof elapsedTime !== 'number' || elapsedTime < 0) {
      return res.status(400).json({ message: 'Invalid elapsed time' });
    }

    const fast = await Fast.findById(fastId);

    if (!fast) {
      return res.status(404).json({ message: 'Fast not found' });
    }

    if (fast.user.toString() !== userId) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    if (!fast.isRunning) {
      return res.status(400).json({ message: 'Fast is already completed' });
    }

    const maxElapsedTime = Date.now() - fast.startTime.getTime();
    fast.elapsedTime = Math.min(elapsedTime, maxElapsedTime);
    await fast.save();

    res.json(fast);
  } catch (error) {
    res.status(500).json({ message: 'Error updating fast', error: error.message });
  }
};

exports.getUserFasts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const fasts = await Fast.find({ user: userId })
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Fast.countDocuments({ user: userId });

    res.json({
      data: fasts, // Wrap the fasts array in a 'data' property
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFasts: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fasts', error: error.message });
  }
};

// Function to get the elapsed time for a specific fast
exports.getFastElapsedTime = async (req, res) => {
  try {
    const { fastId } = req.params;
    const userId = req.user.id;

    const fast = await Fast.findById(fastId);

    if (!fast) {
      return res.status(404).json({ message: 'Fast not found' });
    }

    if (fast.user.toString() !== userId) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const now = new Date();
    const elapsedTime = fast.isRunning 
      ? now.getTime() - fast.startTime.getTime() 
      : fast.elapsedTime;

    res.json({ elapsedTime });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching elapsed time', error: error.message });
  }
};

exports.getFastingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalFasts = await Fast.countDocuments({ user: userId });
    const completedFasts = await Fast.countDocuments({ user: userId, completed: true });
    const longestFast = await Fast.findOne({ user: userId, completed: true }).sort('-elapsedTime').limit(1);
    
    res.json({
      totalFasts,
      completedFasts,
      longestFast: longestFast ? longestFast.elapsedTime : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fasting stats', error: error.message });
  }
};