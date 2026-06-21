const logger = require('../utils/logger');

/**
 * Global centralized error-handling middleware
 */
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error stack trace
  logger.error('Unhandled request error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  const response = {
    status: 'error',
    statusCode,
    message,
  };

  // Provide details only if in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
