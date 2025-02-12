// routes/fastRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Changed from auth to authMiddleware to match server.js
const fastController = require('../controllers/fastController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Route definitions
// Get all fasts for the user with pagination
router.get('/', fastController.getUserFasts);

// Get current active fast
router.get('/current', fastController.getCurrentFast);

// Get fasting statistics
router.get('/stats', fastController.getFastingStats);

// Get elapsed time for a specific fast
router.get('/:id/elapsed', fastController.getFastElapsedTime);

// Start a new fast
router.post('/', fastController.startFast);

// End a fast
router.put('/:id/end', fastController.endFast);

// Update a fast
router.put('/:id', fastController.updateFast);

module.exports = router;