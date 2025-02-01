const express = require('express');
const router = express.Router();
const journeyController = require('../controllers/journeyController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all user's journeys
router.get('/', journeyController.getUserJourneys);

// Create a new journey
router.post('/', journeyController.createJourney);

// Update a specific journey
router.put('/:id', journeyController.updateJourney);

// Delete a specific journey
router.delete('/:id', journeyController.deleteJourney);

// End a fast and create/update journey
router.post('/end-fast/:fastId', journeyController.endFast);

module.exports = router;