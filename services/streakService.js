const db = require('../config/db');
const logger = require('../utils/logger');

class StreakService {
  /**
   * Fetch streak data for a user
   */
  async getStreakByUserId(userId) {
    const sql = `
      SELECT current_streak, longest_streak, last_active_date
      FROM user_streaks
      WHERE user_id = $1
    `;
    const { rows } = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  /**
   * Update user streak based on activity date
   * @param {number} userId - user ID
   * @param {Date|string} dateVal - date of current activity
   */
  async updateStreak(userId, dateVal = new Date()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      const targetDate = new Date(dateVal);
      targetDate.setHours(0, 0, 0, 0); // Strip time
      
      const selectSql = `
        SELECT id, current_streak, longest_streak, last_active_date 
        FROM user_streaks 
        WHERE user_id = $1 
        FOR UPDATE
      `;
      const selectRes = await client.query(selectSql, [userId]);
      
      let currentStreak = 0;
      let longestStreak = 0;
      let lastActiveDate = null;
      let id = null;

      if (selectRes.rows[0]) {
        id = selectRes.rows[0].id;
        currentStreak = selectRes.rows[0].current_streak || 0;
        longestStreak = selectRes.rows[0].longest_streak || 0;
        lastActiveDate = selectRes.rows[0].last_active_date;
      }

      const today = new Date(targetDate);
      
      if (lastActiveDate) {
        const lastDate = new Date(lastActiveDate);
        lastDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Already logged active today, do nothing
          await client.query('COMMIT');
          return { currentStreak, longestStreak, lastActiveDate };
        } else if (diffDays === 1) {
          // Consecutive day - increment streak
          currentStreak += 1;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }
        } else {
          // Missed a day - reset streak to 1
          currentStreak = 1;
        }
      } else {
        // First active day ever
        currentStreak = 1;
        longestStreak = 1;
      }

      let upsertSql;
      let params;

      if (id) {
        upsertSql = `
          UPDATE user_streaks
          SET current_streak = $1, longest_streak = $2, last_active_date = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING current_streak, longest_streak, last_active_date
        `;
        params = [currentStreak, longestStreak, today, id];
      } else {
        upsertSql = `
          INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
          VALUES ($1, $2, $3, $4)
          RETURNING current_streak, longest_streak, last_active_date
        `;
        params = [userId, currentStreak, longestStreak, today];
      }

      const updateRes = await client.query(upsertSql, params);
      await client.query('COMMIT');
      
      logger.info(`Streak updated for user ${userId}: ${currentStreak} days (Record: ${longestStreak} days)`);
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Failed to update streak for user ${userId}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new StreakService();
