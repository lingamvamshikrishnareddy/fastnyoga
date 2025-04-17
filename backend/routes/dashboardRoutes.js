// routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();

// --- Controller Imports ---
const {
  getStats,
  getBulkStats,
  getFastHistory,
  getLeaderboard,
} = require('../controllers/dashboardController');

// --- Middleware Import ---
const { protect } = require('../middleware/authMiddleware');

// --- Define Dashboard Routes ---

// @route   GET /api/dashboard/stats
// @desc    Get aggregated stats for the logged-in user dashboard
// @access  Private
router.get('/stats', protect, getStats);

// @route   GET /api/dashboard/bulk-stats
// @desc    Get admin dashboard statistics with pagination
// @access  Private (Admin only, enforced in controller)
router.get('/bulk-stats', protect, getBulkStats);

// @route   GET /api/dashboard/fast-history
// @desc    Get user fast history with analytics
// @access  Private
router.get('/fast-history', protect, getFastHistory);

// @route   GET /api/dashboard/leaderboard
// @desc    Get leaderboard data
// @access  Private
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;