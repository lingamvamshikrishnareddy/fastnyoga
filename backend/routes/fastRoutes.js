// fastRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const fastController = require('../controllers/fastController');

router.use(authMiddleware);

router.get('/', fastController.getUserFasts);
router.get('/current', fastController.getCurrentFast);
router.get('/stats', fastController.getFastingStats);
router.post('/', fastController.startFast);
router.post('/:fastId/end', fastController.endFast);  // Changed from PUT to POST to match frontend

module.exports = router;
