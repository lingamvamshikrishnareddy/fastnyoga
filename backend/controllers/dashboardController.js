const Dashboard = require('../models/Dashboard');
const User = require('../models/User');
const Fast = require('../models/Fast');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    let dashboard = await Dashboard.findOne({ user: userId });
    if (!dashboard) {
      dashboard = new Dashboard({ user: userId });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate total fasts
    const totalFasts = await Fast.countDocuments({ user: userId, completed: true });

    // Find longest fast
    const longestFast = await Fast.findOne({ user: userId, completed: true }).sort('-elapsedTime');

    // Update dashboard
    dashboard.totalFasts = totalFasts;
    dashboard.longestFast = longestFast ? Math.round(longestFast.elapsedTime / 3600000) : 0;
    dashboard.streak = user.streak || 0;
    dashboard.badges = user.badges || [];
    dashboard.lastUpdated = new Date();

    await dashboard.save();

    // Send response with dashboard stats and user info
    res.json({
      stats: {
        totalFasts: dashboard.totalFasts,
        longestFast: dashboard.longestFast,
      },
      streak: dashboard.streak,
      badges: dashboard.badges,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};