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

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://fastnyoga.vercel.app',
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

// Apply middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection
const startDatabase = async () => {
  try {
    await connectDB();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to the database', error);
    process.exit(1);
  }
};

// Error handling middleware
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

// Routes
app.get('/api/health', (req, res) => {
  logger.info(`Health check from ${req.ip}`);
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/fasts', authMiddleware, fastRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Production static serving with enhanced error handling
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  logger.info(`Serving static files from: ${clientBuildPath}`);

  try {
    const fs = require('fs');
    if (fs.existsSync(clientBuildPath)) {
      app.use(express.static(clientBuildPath));
      
      app.get('*', (req, res) => {
        const indexPath = path.join(clientBuildPath, 'index.html');
        fs.existsSync(indexPath)
          ? res.sendFile(indexPath)
          : res.status(404).send('Frontend build not found');
      });
    } else {
      logger.error('Build directory missing');
      app.get('*', (req, res) => res.status(500).send('Server configuration error'));
    }
  } catch (error) {
    logger.error('Static serving error', error);
    app.get('*', (req, res) => res.status(500).send('Server error'));
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

  logger.error('Global Error', errorDetails);

  if (err.message.includes('CORS')) {
    return res.status(403).json({
      status: 'error',
      message: 'Cross-origin request denied',
      allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
    });
  }

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// Server startup
const startServer = async () => {
  await startDatabase();
  const server = app.listen(PORT, () => logger.info(`
    🚀 Server running on port ${PORT}
    Environment: ${process.env.NODE_ENV || 'development'}
    CORS Allowed Origins: ${allowedOrigins.join(', ')}
  `));
  server.on('error', error => logger.error('Server startup failed', error));
};

startServer();

module.exports = app;
