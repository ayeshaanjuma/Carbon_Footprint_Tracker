const express = require('express');
const router = express.Router();
const healthRouter = require('./health');
const authRouter = require('./auth');

// Health Check Route
router.use('/health', healthRouter);

// Authentication Routes
router.use('/auth', authRouter);

// Global 404 for API namespace
router.use('*', (req, res, next) => {
  const error = new Error(`Cannot find endpoint ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

module.exports = router;
