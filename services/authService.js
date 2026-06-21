const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const userService = require('./userService');
const carbonRecordService = require('./carbonRecordService');
const goalService = require('./goalService');
const challengeService = require('./challengeService');
const streakService = require('./streakService');
const db = require('../config/db');
const logger = require('../utils/logger');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-oauth2-client-id.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretchangeinproduction';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Verify Google OAuth2 ID Token
   * @param {string} token - Google ID Token
   */
  async verifyGoogleToken(token) {
    // Support mock token for local testing/verification
    if (token && token.startsWith('mock-google-token-')) {
      const email = token.replace('mock-google-token-', '');
      const name = email.split('@')[0];
      logger.info(`Bypassing Google token verification with mock token for email: ${email}`);
      return {
        email: email,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        googleId: `mock-google-id-${name}`
      };
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      return {
        email: payload.email,
        name: payload.name,
        googleId: payload.sub
      };
    } catch (err) {
      logger.error('Google token verification failed', err);
      throw new Error('Invalid Google authentication token');
    }
  }

  /**
   * Sign a local JWT access token
   */
  generateLocalToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' } // Long session lifetime for native dashboard
    );
  }

  /**
   * Migrate guest session data to an authenticated user account
   */
  async migrateGuestData(userId, guestData) {
    if (!guestData) return;
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      logger.info(`Commencing guest data migration to User ${userId}...`);

      // 1. Migrate target goals
      if (guestData.weeklyTarget) {
        // Upsert target: weekly target and allowance (allowance calculated as weekly * 4)
        const weekly = Number(guestData.weeklyTarget);
        const monthly = weekly * 4;
        await goalService.upsertGoal(userId, weekly, monthly);
      }

      // 2. Migrate carbon records
      if (Array.isArray(guestData.history)) {
        for (const log of guestData.history) {
          // Avoid duplicate inserts for logs already migrated/inserted on loggedDate
          const checkRecord = `
            SELECT id FROM carbon_records 
            WHERE user_id = $1 AND logged_date = $2 AND deleted_at IS NULL
          `;
          // Map string date (e.g. 'Oct 14' to current year object or parseable date)
          // We can parse or fallback to current date
          let logDate = new Date();
          if (log.date) {
            const parsed = Date.parse(log.date);
            if (!isNaN(parsed)) logDate = new Date(parsed);
          }

          const checkRes = await client.query(checkRecord, [userId, logDate]);
          if (!checkRes.rows[0]) {
            // Log record using record service factors or standard fallback
            await carbonRecordService.logWeeklyRecord(userId, {
              weeklyFootprint: log.co2 || 0,
              carbonScore: log.score || 100,
              loggedDate: logDate,
              // Setup default factors matching local settings
              drivingDistance: 150,
              flights: 2,
              meatMeals: 5,
              electricityUsage: 250,
              heatingType: 'gas'
            });
          }
        }
      }

      // 3. Migrate streaks
      if (guestData.streak || guestData.longestStreak) {
        const streakRow = `
          SELECT id, current_streak, longest_streak FROM user_streaks WHERE user_id = $1
        `;
        const streakRes = await client.query(streakRow, [userId]);
        const currentStr = Number(guestData.streak || 0);
        const longestStr = Number(guestData.longestStreak || 0);

        if (streakRes.rows[0]) {
          const dbCurrent = streakRes.rows[0].current_streak;
          const dbLongest = streakRes.rows[0].longest_streak;

          await client.query(`
            UPDATE user_streaks
            SET current_streak = $1, longest_streak = $2, last_active_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3
          `, [Math.max(dbCurrent, currentStr), Math.max(dbLongest, longestStr), userId]);
        } else {
          await client.query(`
            INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
            VALUES ($1, $2, $3, CURRENT_DATE)
          `, [userId, currentStr, longestStr]);
        }
      }

      // 4. Migrate completed challenges
      if (Array.isArray(guestData.completedChallenges)) {
        for (const challengeKey of guestData.completedChallenges) {
          // challengeKey matches format: 'category-id' (e.g. 'transport-1')
          const parts = challengeKey.split('-');
          if (parts.length === 2) {
            const category = parts[0];
            const relativeId = parseInt(parts[1], 10);
            
            // Map template challenges relative offset to db ids
            const queryCh = `
              SELECT id, xp_reward FROM daily_challenges 
              WHERE category = $1 AND deleted_at IS NULL 
              ORDER BY id ASC
            `;
            const chRes = await client.query(queryCh, [category]);
            // If we have mapped templates in database seed, fetch corresponding ID
            if (chRes.rows[relativeId - 1]) {
              const dbChallengeId = chRes.rows[relativeId - 1].id;
              const xpReward = chRes.rows[relativeId - 1].xp_reward;

              const checkProgress = `
                SELECT id FROM challenge_progress 
                WHERE user_id = $1 AND challenge_id = $2 AND completed_date = CURRENT_DATE
              `;
              const progressRes = await client.query(checkProgress, [userId, dbChallengeId]);
              if (!progressRes.rows[0]) {
                await client.query(`
                  INSERT INTO challenge_progress (user_id, challenge_id, completed, completed_date)
                  VALUES ($1, $2, true, CURRENT_DATE)
                `, [userId, dbChallengeId]);
                
                // Add user XP in UserService (inside transaction)
                await client.query(`
                  UPDATE users
                  SET xp = xp + $1, level = ((xp + $1) / 200) + 1
                  WHERE id = $2
                `, [xpReward, userId]);
              }
            }
          }
        }
      }

      await client.query('COMMIT');
      logger.info(`Guest data successfully migrated to User Account ${userId}.`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Migration of guest data failed for User ${userId}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new AuthService();
