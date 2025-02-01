const express = require('express');
const router = express.Router();
const { register, login, getUser, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many attempts, please try again later' },
  skipSuccessfulRequests: true
});

// Register route
router.post('/register', register);

// Login route with rate limiting
router.post('/login', authLimiter, login);

// Get user route with auth middleware
router.get('/user', authMiddleware, getUser);

// Logout route with auth middleware
router.post('/logout', authMiddleware, logout);

module.exports = router;