// Load Environment Configurations
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Express Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} request received at ${req.path}`);
  next();
});

// API Routes Router mapping
app.use('/api/v1', routes);

// Global fallback handler for root or static routing
app.use((req, res, next) => {
  const error = new Error(`Cannot find resource ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// Centralized Error-handling middleware
app.use(errorHandler);

// Listen to network port
const server = app.listen(PORT, () => {
  logger.info(`Server successfully started in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle graceful shutdown signals
const gracefulShutdown = () => {
  logger.info('Received shutdown signal. Commencing graceful server stop...');
  server.close(async () => {
    logger.info('Express server successfully stopped.');
    try {
      const db = require('./config/db');
      await db.closePool();
      logger.info('Database pool successfully ended. Shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error('Failed to cleanly shut down database client connections', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
