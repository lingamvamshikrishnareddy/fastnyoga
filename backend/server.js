// server.js

// --- Load Environment Variables FIRST ---
// This ensures JWT_SECRET and other env vars are available when other modules are loaded
require('dotenv').config();

// --- Standard Imports ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// --- Custom Modules & Config ---
const connectDB = require('./config/db');
const redisClient = require('./config/redis'); // Assuming this connects/handles Redis

// Import routes
const authRoutes = require('./routes/authRoutes'); // Contains public (login, register) and private (user, logout) routes
const goalRoutes = require('./routes/goalRoutes');
const progressRoutes = require('./routes/progressRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const fastRoutes = require('./routes/fastRoutes');

// Import protect middleware
const { protect } = require('./middleware/authMiddleware');

// --- Initialize Express App ---
const app = express();

// --- Core Middleware ---

// CORS Configuration
app.use(cors({
  origin: 'http://localhost:3000', // Specific frontend URL for security
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] // Ensure Authorization is allowed
}));

// Body Parsers
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: false })); // For parsing application/x-www-form-urlencoded

// Cookie Parser
app.use(cookieParser()); // For handling cookies if needed (e.g., refresh tokens)

// --- Redis Client ---
// Make Redis client available to route handlers if needed (e.g., req.app.get('redisClient'))
app.set('redisClient', redisClient);

// --- Health Check Route ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    redis: redisClient && redisClient.isReady ? 'connected' : 'disconnected' // Check if redisClient exists and is ready
  });
});

// --- API Routes ---

// Authentication Routes (/api/auth)
// Handles login, registration, fetching user data, logout.
// Note: Protection for specific routes like /api/auth/user and /api/auth/logout
// is handled *inside* authRoutes.js using the 'protect' middleware.
app.use('/api/auth', authRoutes);

// Protected API Routes
// The 'protect' middleware runs BEFORE the request reaches the specific route handlers below.
// It verifies the JWT token from the 'Authorization: Bearer <token>' header.
app.use('/api/fasts', protect, fastRoutes);
app.use('/api/goals', protect, goalRoutes);
app.use('/api/progress', protect, progressRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);

// --- Serve Static Assets in Production ---
if (process.env.NODE_ENV === 'production') {
  // Set static folder (adjust path if your structure differs)
  app.use(express.static(path.join(__dirname, 'client/build')));

  // Catch-all route to serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// --- Global Error Handling Middleware ---
// Must be defined AFTER all other app.use() and routes
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:");
  console.error(err.stack);
  // Determine status code - default to 500 if not set
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    // Optionally include stack trace in development
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// --- Server Initialization ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB(); // Assuming this logs success/failure

    // Ensure Redis is connected (optional, depends on redisClient setup)
    if (redisClient && !redisClient.isReady) {
      console.warn('Redis client is configured but not connected.');
      // You might want to attempt connection here or handle it within redis.js
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`FATAL: Failed to start server - ${error.message}`);
    process.exit(1); // Exit process if essential services fail to start
  }
};

// Execute server startup
startServer();

// Export app for potential testing
module.exports = { app, redisClient };