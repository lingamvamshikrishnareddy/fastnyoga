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
// Modified redis client import to handle connection errors better
let redisClient;
try {
  redisClient = require('./config/redis');
} catch (error) {
  console.warn('Redis client failed to initialize:', error.message);
  redisClient = null;
}

// Import routes
const authRoutes = require('./routes/authRoutes');
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
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
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
// Make Redis client available to route handlers if needed, only if connected
if (redisClient && redisClient.isReady) {
  app.set('redisClient', redisClient);
}

// --- Health Check Route ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    redis: redisClient && redisClient.isReady ? 'connected' : 'disconnected'
  });
});

// --- API Routes ---

// Authentication Routes (/api/auth)
app.use('/api/auth', authRoutes);

// Protected API Routes
app.use('/api/fasts', protect, fastRoutes);
app.use('/api/goals', protect, goalRoutes);
app.use('/api/progress', protect, progressRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);

// --- Serve Static Assets in Production ---
if (process.env.NODE_ENV === 'production') {
  // Update the static folder path to match Render's structure
  const staticPath = path.resolve('/opt/render/project/src/backend/client/build');
  
  // Check if the directory exists before setting it as static
  const fs = require('fs');
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    
    // Catch-all route to serve index.html for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  } else {
    console.warn(`Static directory not found at: ${staticPath}`);
    // Fallback route if build directory doesn't exist
    app.get('*', (req, res) => {
      res.status(404).send('Frontend build not found. Please ensure the client build process has completed.');
    });
  }
}

// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:");
  console.error(err);
  // Determine status code - default to 500 if not set
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// --- Server Initialization ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`Redis connection status: ${redisClient && redisClient.isReady ? 'connected' : 'disconnected'}`);
    });
  } catch (error) {
    console.error(`FATAL: Failed to start server - ${error.message}`);
    process.exit(1);
  }
};

// Execute server startup
startServer();

// Export app for potential testing
module.exports = { app, redisClient };
