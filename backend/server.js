const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const progressRoutes = require('./routes/progressRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const fastRoutes = require('./routes/fastRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  ...process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(',') : []
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-ID'
  ],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  optionsSuccessStatus: 204
};

// Enhanced logging function
const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  }
};

// Apply CORS and other middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to the database with enhanced logging
const startDatabase = async () => {
  try {
    await connectDB();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to the database', error);
    process.exit(1);
  }
};

// Global error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('JSON Parsing Error', err);
    return res.status(400).json({ 
      status: 'error',
      message: 'Invalid JSON payload',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// Health check route with enhanced logging
app.get('/api/health', (req, res) => {
  logger.info(`Health check from ${req.ip}`);
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/fasts', authMiddleware, fastRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Serve static files in production with error handling
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  
  // Log the exact path being used
  logger.info(`Attempting to serve static files from: ${clientBuildPath}`);
  
  try {
    // Check if the build directory exists
    const fs = require('fs');
    fs.accessSync(clientBuildPath, fs.constants.R_OK);
    
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
      const indexPath = path.resolve(clientBuildPath, 'index.html');
      
      // Additional check before sending file
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        logger.error(`Index file not found: ${indexPath}`);
        res.status(404).send('Frontend build not found');
      }
    });
  } catch (error) {
    logger.error('Error setting up production static file serving', error);
    // Fallback error handling
    app.get('*', (req, res) => {
      res.status(500).send('Frontend build directory not found');
    });
  }
}

// Global error handling middleware with enhanced logging
app.use((err, req, res, next) => {
  logger.error('Unhandled Error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  });

  // Handle CORS errors
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({
      status: 'error',
      message: 'CORS origin not allowed',
      allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server with comprehensive startup logging
const startServer = async () => {
  try {
    // Start database connection first
    await startDatabase();

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`
      🚀 Server Running Successfully! 🎉
      --------------------------------
      • Port: ${PORT}
      • Environment: ${process.env.NODE_ENV || 'development'}
      • Timestamp: ${new Date().toISOString()}
      • Process ID: ${process.pid}
      --------------------------------
      `);
    });

    // Handle server startup errors
    server.on('error', (error) => {
      logger.error('Server startup failed', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Initiate server startup
startServer();

module.exports = app;
