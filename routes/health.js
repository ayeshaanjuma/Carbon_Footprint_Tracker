const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * @route GET /api/v1/health
 * @desc Get backend server and database connection health status
 */
router.get('/', async (req, res, next) => {
  try {
    const isDbConnected = await db.checkConnection();
    
    const health = {
      status: isDbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        server: 'online',
        database: isDbConnected ? 'connected' : 'disconnected'
      }
    };

    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    logger.error('Healthcheck endpoint failure', err);
    next(err);
  }
});

module.exports = router;
