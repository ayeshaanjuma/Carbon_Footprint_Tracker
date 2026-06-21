const db = require('../config/db');
const logger = require('../utils/logger');

class AICoachService {
  /**
   * Log an AI Coach recommendation or user question reply
   */
  async logCoachRecommendation(userId, highestCategory, query, response) {
    const sql = `
      INSERT INTO ai_recommendation_history (user_id, highest_category, query, response)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await db.query(sql, [userId, highestCategory, query, response]);
    logger.info(`AI Recommendation logged for user ${userId} (ID: ${rows[0].id}, Category: ${highestCategory})`);
    return rows[0];
  }

  /**
   * Retrieve recommendation logs history for a user
   */
  async getRecommendationHistory(userId, limit = 10) {
    const sql = `
      SELECT id, highest_category, query, response, created_at
      FROM ai_recommendation_history
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const { rows } = await db.query(sql, [userId, limit]);
    return rows;
  }

  /**
   * Soft delete an AI Recommendation history entry
   */
  async softDeleteRecommendation(id, userId) {
    const sql = `
      UPDATE ai_recommendation_history
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    const { rows } = await db.query(sql, [id, userId]);
    if (rows[0]) {
      logger.info(`AI Recommendation soft-deleted: ID ${id} for User ${userId}`);
    }
    return rows[0] || null;
  }
}

module.exports = new AICoachService();
