const express = require('express');
const router = express.Router();
const { addWeight, getUserWeights } = require('../controllers/weightController');
const auth = require('../middleware/authMiddleware');

router.post('/add', auth, addWeight);
router.get('/user', auth, getUserWeights);

module.exports = router;
