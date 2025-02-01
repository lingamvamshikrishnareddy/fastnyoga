const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware to protect the route

// Route to get user stats
router.get('/stats', authMiddleware, getStats);
router.get('/api/fasts/current', async (req, res) => {
    try {
      const userId = req.user.id; // Assuming you have authentication middleware
      const currentFast = await Fast.findOne({ user: userId, isRunning: true });
      if (currentFast) {
        res.json(currentFast);
      } else {
        res.status(404).json({ message: 'No current fast found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
module.exports = router;
