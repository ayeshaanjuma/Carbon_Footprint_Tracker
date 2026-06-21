const db = require('../config/db');
const logger = require('../utils/logger');

class GoalService {
  /**
   * Set or update a user's carbon reduction targets
   */
  async upsertGoal(userId, weeklyTarget, monthlyAllowance) {
    const checkSql = 'SELECT id FROM carbon_goals WHERE user_id = $1 AND deleted_at IS NULL';
    const checkRes = await db.query(checkSql, [userId]);

    let sql;
    let params;

    if (checkRes.rows[0]) {
      // Update
      sql = `
        UPDATE carbon_goals
        SET weekly_target = $1, monthly_allowance = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;
      params = [weeklyTarget, monthlyAllowance, userId];
    } else {
      // Insert
      sql = `
        INSERT INTO carbon_goals (weekly_target, monthly_allowance, user_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      params = [weeklyTarget, monthlyAllowance, userId];
    }

    const { rows } = await db.query(sql, params);
    logger.info(`Goals upserted for user ${userId} (Target: ${weeklyTarget} kg, Allowance: ${monthlyAllowance} kg)`);
    return rows[0];
  }

  /**
   * Get target goal values by user ID
   */
  async getGoalByUserId(userId) {
    const sql = `
      SELECT id, weekly_target, monthly_allowance, created_at, updated_at
      FROM carbon_goals
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    const { rows } = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  /**
   * Soft delete a target goal configuration
   */
  async softDeleteGoal(userId) {
    const sql = `
      UPDATE carbon_goals
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    const { rows } = await db.query(sql, [userId]);
    if (rows[0]) {
      logger.info(`Goals soft-deleted for user ${userId}`);
    }
    return rows[0] || null;
  }
}

module.exports = new GoalService();
