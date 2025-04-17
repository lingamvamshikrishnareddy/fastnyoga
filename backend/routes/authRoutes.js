// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// --- Import Controller Functions ---
// Adjust the path '../controllers/authController' if your file is located elsewhere
const {
    register,
    login,
    logout,
    getCurrentUser // Make sure you have a function like this in your controller
} = require('../controllers/authController');

// --- Define Routes ---

// @route   POST api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', register); // Use the imported register function

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);       // Use the imported login function

// @route   GET api/auth/user
// @desc    Get current logged-in user data
// @access  Private (requires token via 'protect' middleware)
router.get('/user', protect, getCurrentUser); // Use the imported function for handling this

// @route   POST api/auth/logout
// @desc    Logout user (can be used for server-side cleanup if needed)
// @access  Private (ensures only authenticated users can call it)
router.post('/logout', protect, logout);    // Use the imported logout function

module.exports = router;