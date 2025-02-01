const Journey = require('../models/Journey');
const Fast = require('../models/Fast');
const User = require('../models/User');

exports.getUserJourneys = async (req, res) => {
  try {
    const userId = req.user.id;
    const journeys = await Journey.find({ user: userId })
      .populate('fastId', 'targetHours') // Optional: populate fast details
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean(); // Convert to plain JavaScript object for easier manipulation

    res.json(journeys);
  } catch (error) {
    console.error('Error fetching journeys:', error);
    res.status(500).json({ 
      message: 'Error retrieving journeys', 
      error: error.message 
    });
  }
};

exports.createJourney = async (req, res) => {
  try {
    const userId = req.user.id;
    const journeyData = {
      ...req.body,
      user: userId,
      status: 'in-progress'
    };

    const journey = new Journey(journeyData);
    await journey.save();

    res.status(201).json(journey);
  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ 
      message: 'Error creating journey', 
      error: error.message 
    });
  }
};

exports.updateJourney = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const journey = await Journey.findOneAndUpdate(
      { _id: id, user: userId }, 
      req.body, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!journey) {
      return res.status(404).json({ message: 'Journey not found' });
    }
    
    res.json(journey);
  } catch (error) {
    console.error('Error updating journey:', error);
    res.status(500).json({ 
      message: 'Error updating journey', 
      error: error.message 
    });
  }
};

exports.deleteJourney = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const journey = await Journey.findOneAndDelete({ 
      _id: id, 
      user: userId 
    });
    
    if (!journey) {
      return res.status(404).json({ message: 'Journey not found' });
    }
    
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ 
      message: 'Error deleting journey', 
      error: error.message 
    });
  }
};

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
    const startTime = fast.startTime;
    const endTime = now;

    // Calculate elapsed time in milliseconds
    const elapsedTime = Math.max(0, now.getTime() - startTime.getTime());

    // Calculate hours fasted
    const hoursFasted = Math.floor(elapsedTime / (1000 * 60 * 60));

    // Update fast details
    fast.endTime = endTime;
    fast.completed = true;
    fast.isRunning = false;
    fast.elapsedTime = elapsedTime;
    fast.hoursFasted = hoursFasted;

    await fast.save();

    // Find or create corresponding journey
    let journey = await Journey.findOne({
      fastId: fastId,
      user: userId
    });

    if (!journey) {
      // Create new journey if not exists
      journey = new Journey({
        user: userId,
        fastId: fastId,
        startTime: startTime,
        endTime: endTime,
        targetHours: fast.targetHours,
        duration: elapsedTime,
        hoursFasted: hoursFasted,
        status: 'completed'
      });
    } else {
      // Update existing journey
      journey.endTime = endTime;
      journey.duration = elapsedTime;
      journey.hoursFasted = hoursFasted;
      journey.status = 'completed';
    }

    await journey.save();

    // Update user details
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

    res.json({
      fast,
      journey,
      user: {
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Error ending fast:', error);
    res.status(500).json({ 
      message: 'Error ending fast', 
      error: error.message 
    });
  }
};