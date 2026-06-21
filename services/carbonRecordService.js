const db = require('../config/db');
const logger = require('../utils/logger');

class CarbonRecordService {
  /**
   * Log a new weekly footprint calculation
   */
  async logWeeklyRecord(userId, recordData) {
    const {
      drivingDistance = 0,
      flights = 0,
      meatMeals = 0,
      foodWasteLevel = 1,
      electricityUsage = 0,
      heatingType = 'gas',
      weeklyFootprint,
      carbonScore,
      loggedDate = new Date()
    } = recordData;

    const sql = `
      INSERT INTO carbon_records (
        user_id, driving_distance, flights, meat_meals, food_waste_level, 
        electricity_usage, heating_type, weekly_footprint, carbon_score, logged_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await db.query(sql, [
      userId, drivingDistance, flights, meatMeals, foodWasteLevel,
      electricityUsage, heatingType, weeklyFootprint, carbonScore, loggedDate
    ]);

    logger.info(`Carbon record logged for user ${userId} (ID: ${rows[0].id}, Footprint: ${weeklyFootprint} kg)`);
    return rows[0];
  }

  /**
   * Retrieve carbon logs history for a specific user
   * @param {number} userId - user identifier
   * @param {number} limit - max rows count (default 10)
   */
  async getHistory(userId, limit = 10) {
    const sql = `
      SELECT id, driving_distance, flights, meat_meals, food_waste_level,
             electricity_usage, heating_type, weekly_footprint, carbon_score,
             logged_date, created_at
      FROM carbon_records
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY logged_date DESC, created_at DESC
      LIMIT $2
    `;
    const { rows } = await db.query(sql, [userId, limit]);
    return rows;
  }

  /**
   * Soft delete a logged weekly carbon record
   */
  async softDeleteRecord(id, userId) {
    const sql = `
      UPDATE carbon_records
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    const { rows } = await db.query(sql, [id, userId]);
    if (rows[0]) {
      logger.info(`Carbon record soft-deleted: ID ${id} for User ${userId}`);
    }
    return rows[0] || null;
  }
}

module.exports = new CarbonRecordService();
