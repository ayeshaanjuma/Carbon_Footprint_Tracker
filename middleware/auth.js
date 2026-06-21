const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretchangeinproduction';

/**
 * Middleware protecting endpoints by verifying JWT authorization tokens
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Access denied. Authorization token missing or malformed.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Sets req.user = { id: user.id, email: user.email }
    next();
  } catch (err) {
    logger.warn('JWT verification failure', { token: token.substring(0, 10) + '...', error: err.message });
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Access denied. Authorization token is invalid or expired.'
    });
  }
};
