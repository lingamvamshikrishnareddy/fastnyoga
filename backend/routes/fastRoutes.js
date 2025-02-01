const express = require('express');
const router = express.Router();
const {
  startFast,
  endFast,
  getUserFasts,
  updateFast,
  getCurrentFast,
  getFastElapsedTime,
  getFastingStats
} = require('../controllers/fastController');
const auth = require('../middleware/authMiddleware');

router.post('/start', auth, startFast);
router.put('/end/:fastId', auth, endFast);
router.get('/user', auth, getUserFasts);
router.put('/update/:fastId', auth, updateFast);
router.get('/current', auth, getCurrentFast);
router.get('/elapsed/:fastId', auth, getFastElapsedTime);
router.get('/stats', auth, getFastingStats);

module.exports = router;