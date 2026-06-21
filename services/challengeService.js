const db = require('../config/db');
const userService = require('./userService');
const logger = require('../utils/logger');

class ChallengeService {
  /**
   * Fetch active challenges filtered by category
   * @param {string} category - 'transport', 'diet', or 'energy'
   */
  async getChallengesByCategory(category) {
    const sql = `
      SELECT id, category, title, description, icon, xp_reward
      FROM daily_challenges
      WHERE category = $1 AND deleted_at IS NULL
    `;
    const { rows } = await db.query(sql, [category]);
    return rows;
  }

  /**
   * Log challenge completion progress and award user XP
   */
  async completeChallenge(userId, challengeId, completedDate = new Date()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Verify challenge exists and fetch XP reward value
      const selectCh = 'SELECT xp_reward, title FROM daily_challenges WHERE id = $1 AND deleted_at IS NULL';
      const selectRes = await client.query(selectCh, [challengeId]);
      if (!selectRes.rows[0]) {
        throw new Error('Challenge not found or has been deleted');
      }
      
      const { xp_reward: xpReward, title } = selectRes.rows[0];

      // 2. Check if already completed on this date to prevent duplicate XP rewards
      const selectProgress = `
        SELECT id, completed 
        FROM challenge_progress 
        WHERE user_id = $1 AND challenge_id = $2 AND completed_date = $3
      `;
      const progressRes = await client.query(selectProgress, [userId, challengeId, completedDate]);

      let rewardApplied = false;

      if (progressRes.rows[0]) {
        if (!progressRes.rows[0].completed) {
          // Toggle to true
          await client.query(`
            UPDATE challenge_progress
            SET completed = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [progressRes.rows[0].id]);
          rewardApplied = true;
        }
      } else {
        // Insert new completed progress record
        await client.query(`
          INSERT INTO challenge_progress (user_id, challenge_id, completed, completed_date)
          VALUES ($1, $2, true, $3)
        `, [userId, challengeId, completedDate]);
        rewardApplied = true;
      }

      await client.query('COMMIT');

      // 3. Award XP outside transaction using UserService helper
      if (rewardApplied) {
        logger.info(`User ${userId} completed challenge: "${title}". Awarding +${xpReward} XP.`);
        await userService.addXpAndLevelUp(userId, xpReward);
      }

      return { status: 'success', completed: true, xpAwarded: rewardApplied ? xpReward : 0 };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to complete challenge', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of challenges completed by user on a specific date
   */
  async getDailyCompletedChallenges(userId, date = new Date()) {
    const sql = `
      SELECT cp.challenge_id, dc.title, dc.category, cp.completed_date
      FROM challenge_progress cp
      JOIN daily_challenges dc ON cp.challenge_id = dc.id
      WHERE cp.user_id = $1 AND cp.completed = true AND cp.completed_date = $2
    `;
    const { rows } = await db.query(sql, [userId, date]);
    return rows;
  }

  /**
   * Soft delete a challenge template
   */
  async softDeleteChallenge(id) {
    const sql = `
      UPDATE daily_challenges
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    const { rows } = await db.query(sql, [id]);
    if (rows[0]) {
      logger.info(`Challenge template soft-deleted: ID ${id}`);
    }
    return rows[0] || null;
  }
}

module.exports = new ChallengeService();
