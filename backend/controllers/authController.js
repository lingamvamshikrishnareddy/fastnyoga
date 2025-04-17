// controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// --- Validation Helper ---
const validateRegistration = (data) => {
  const errors = [];
  if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { errors.push('Valid email is required'); }
  if (!data.password || data.password.length < 6) { errors.push('Password must be at least 6 characters long'); }
  if (!data.username || data.username.length < 3) { errors.push('Username must be at least 3 characters long'); }
  return errors;
};

// --- JWT Helper ---
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not set');
    throw new Error('Server configuration error [JWT]');
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// --- Register Controller ---
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    logger.info('Registration attempt:', { email, username });

    const validationErrors = validateRegistration(req.body);
    if (validationErrors.length > 0) {
      logger.warn('Registration validation failed:', { email, username, errors: validationErrors });
      return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    }).lean();

    if (existingUser) {
      const message = existingUser.email === email.toLowerCase() ? 'Email already registered' : 'Username already taken';
      logger.warn('Registration failed - existing user:', { email, username, reason: message });
      return res.status(400).json({ message });
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password
    });

    await user.save();
    logger.info('User registered successfully:', { userId: user._id, email: user.email });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id, // Changed from _id to id for consistency if needed
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('Registration error:', { message: error.message, stack: error.stack });
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This email or username is already registered.' });
    }
    if (error.message.includes('[JWT]')) {
         return res.status(500).json({ message: 'Server configuration error.' });
    }
    res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
};

// --- Login Controller ---
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info('Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
       logger.warn('Login failed: Invalid credentials for email:', { email });
       return res.status(401).json({ message: 'Invalid credentials' });
    }

    logger.info('Login successful for user:', { userId: user._id, email: user.email });

    // Inside login function, before generateToken or jwt.sign
console.log(`AUTH_CONTROLLER_LOGIN: JWT_SECRET Check: ${process.env.JWT_SECRET ? 'Set (' + process.env.JWT_SECRET.substring(0, 3) + '...)' : '!!! UNDEFINED !!!'}`);


    const token = generateToken(user._id);

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      token,
      user: {
        id: user._id, // Changed from _id to id
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error('Login error:', { message: error.message, stack: error.stack });
     if (error.message.includes('[JWT]')) {
          return res.status(500).json({ message: 'Server configuration error.' });
     }
    res.status(500).json({ message: 'Login failed. Please try again later.' });
  }
};

// --- Get Current User Controller (Protected Route) ---  <<<<<<<< RENAMED HERE
const getCurrentUser = async (req, res) => {
  try {
    // req.user is populated by the 'protect' middleware
    if (!req.user || !req.user._id) { // Check for _id as populated by lean() object from middleware
         logger.error('Get user error: req.user not populated correctly by middleware');
         return res.status(500).json({ message: 'Authentication error' });
    }

    logger.info('Fetching user data for userId:', { userId: req.user._id });

    // Return the user object attached by the middleware
    // Ensure frontend consistency: Use 'id' or '_id' based on what frontend expects
    res.json({
      success: true,
      user: {
          _id: req.user._id, // Use _id as provided by middleware
          id: req.user._id,  // Provide 'id' alias if frontend prefers it
          username: req.user.username,
          email: req.user.email
          // Add other fields from req.user if needed
      }
    });

  } catch (error) {
    logger.error('Get user error:', { message: error.message, userId: req.user?._id });
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

// --- Logout Controller ---
const logout = async (req, res) => {
  try {
    logger.info('User logged out (client-side action):', { userId: req.user?._id });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Logout failed' });
  }
};


// --- Correct Export --- <<<<<<<<<< UPDATED HERE
module.exports = {
  register,
  login,
  getCurrentUser, // Export using the new name
  logout
};