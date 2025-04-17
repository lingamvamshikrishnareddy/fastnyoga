// fastRoutes.js
const express = require('express');
const router = express.Router();
const FastingController = require('../controllers/FastingController.js');

// Define routes
router.post('/start', FastingController.startFast);
router.put('/end/:fastId', FastingController.endFast);
router.get('/current', FastingController.getCurrentFast);
router.get('/user', FastingController.getUserFasts);
router.get('/stats', FastingController.getUserStats);
router.get('/dashboard', FastingController.getDashboardStats);
router.put('/:fastId', FastingController.updateFast);
router.delete('/:fastId', FastingController.deleteFast);
router.get('/insights', FastingController.getFastingInsights);

module.exports = router;