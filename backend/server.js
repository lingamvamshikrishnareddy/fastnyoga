const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Enhanced logging utility
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

// CORS configuration with multiple frontend URLs
const allowedOrigins = [
  'http://localhost:3000',
  'https://fastnyoga.vercel.app',
  'https://fastnyoga-lingamvamshikrishnareddys-projects.vercel.app',
  process.env.FRONTEND_URL,
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(',') : [])
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const originAllowed = allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || origin.includes(allowedOrigin)
    ) || origin.includes('vercel.app') || origin.includes('localhost');

    originAllowed 
      ? callback(null, true)
      : callback(new Error(`Origin ${origin} not allowed by CORS`));
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

// Apply middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection with enhanced error handling
const startDatabase = async () => {
  try {
    // Mongoose strictQuery deprecation warning fix
    mongoose.set('strictQuery', false);
    
    await connectDB();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to the database', error);
    process.exit(1);
  }
};

// JSON parsing error handler
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

// Health check route
app.get('/api/health', (req, res) => {
  logger.info(`Health check from ${req.ip}`);
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/fasts', authMiddleware, fastRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Production static file serving with enhanced error handling
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  logger.info(`Attempting to serve static files from: ${clientBuildPath}`);

  try {
    if (fs.existsSync(clientBuildPath)) {
      app.use(express.static(clientBuildPath));
      
      app.get('*', (req, res) => {
        const indexPath = path.join(clientBuildPath, 'index.html');
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          logger.error('index.html not found in build directory');
          res.status(500).send('Frontend build incomplete');
        }
      });
    } else {
      logger.error('Frontend build directory does not exist');
      app.get('*', (req, res) => {
        res.status(500).send('Server configuration error: Build directory missing');
      });
    }
  } catch (error) {
    logger.error('Error serving static files', error);
    app.get('*', (req, res) => res.status(500).send('Server error during static file serving'));
  }
}

// Global error handler
app.use((err, req, res, next) => {
  const errorDetails = {
    message: err.message,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  logger.error('Global Error Handler', errorDetails);

  // CORS error specific handling
  if (err.message.includes('not allowed by CORS')) {
    return res.status(403).json({
      status: 'error',
      message: 'Cross-origin request denied',
      allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// Server startup
const startServer = async () => {
  try {
    await startDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`
🚀 Server running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
CORS Allowed Origins: ${allowedOrigins.join(', ')}
      `);
    });

    // Handle server startup errors
    server.on('error', error => {
      logger.error('Server startup failed', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
