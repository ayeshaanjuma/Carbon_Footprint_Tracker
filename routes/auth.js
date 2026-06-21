const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * @route POST /api/v1/auth/google
 * @desc Verify Google token, login/register user, migrate guest data, and return local JWT
 */
router.post('/google', async (req, res, next) => {
  try {
    const { token, guestData } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Google identification token is required.'
      });
    }

    // Verify Google ID token
    let googleUser;
    try {
      googleUser = await authService.verifyGoogleToken(token);
    } catch (verifyErr) {
      logger.error('Google token verification error in route', verifyErr);
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication failed. Invalid Google credentials.'
      });
    }

    const { email, name } = googleUser;

    // Check if user exists
    let user = await userService.getUserByEmail(email);

    if (!user) {
      logger.info(`Creating new user account for ${email} via Google sign-in`);
      // Since password_hash has NOT NULL constraint, we set a dummy value
      user = await userService.createUser(name, email, 'google_oauth_placeholder');
    }

    // Migrate guest data to the database account
    if (guestData) {
      try {
        await authService.migrateGuestData(user.id, guestData);
        // Refresh user profile if XP or Level was updated during migration
        user = await userService.getUserById(user.id);
      } catch (migrationErr) {
        logger.error(`Failed to migrate guest data for user ${user.id}`, migrationErr);
        // We do not fail the login if migration fails, but log it
      }
    }

    // Generate JWT token
    const localToken = authService.generateLocalToken(user);

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Successfully authenticated with Google.',
      data: {
        token: localToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          xp: user.xp,
          level: user.level
        }
      }
    });

  } catch (err) {
    logger.error('Authentication route error', err);
    next(err);
  }
});

module.exports = router;
