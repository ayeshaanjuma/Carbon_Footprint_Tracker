const db = require('../config/db');
const logger = require('../utils/logger');

class UserService {
  /**
   * Create a new user account
   */
  async createUser(name, email, passwordHash) {
    const sql = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, xp, level, created_at
    `;
    const { rows } = await db.query(sql, [name, email, passwordHash]);
    logger.info(`User created successfully: ${email} (ID: ${rows[0].id})`);
    return rows[0];
  }

  /**
   * Get user profile by ID (excluding password hash)
   */
  async getUserById(id) {
    const sql = `
      SELECT id, name, email, xp, level, created_at, updated_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Get user credential record by email (includes password hash for auth)
   */
  async getUserByEmail(email) {
    const sql = `
      SELECT id, name, email, password_hash, xp, level, created_at, deleted_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;
    const { rows } = await db.query(sql, [email]);
    return rows[0] || null;
  }

  /**
   * Increment XP and calculate level progression
   */
  async addXpAndLevelUp(userId, xpGained) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Fetch current XP
      const selectSql = 'SELECT xp FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE';
      const selectRes = await client.query(selectSql, [userId]);
      if (!selectRes.rows[0]) {
        throw new Error('User not found');
      }

      const currentXp = selectRes.rows[0].xp || 0;
      const newXp = currentXp + xpGained;
      // Level formula: Level = Math.floor(xp / 200) + 1
      const newLevel = Math.floor(newXp / 200) + 1;

      // Update user state
      const updateSql = `
        UPDATE users
        SET xp = $1, level = $2
        WHERE id = $3
        RETURNING id, name, xp, level
      `;
      const updateRes = await client.query(updateSql, [newXp, newLevel, userId]);
      
      await client.query('COMMIT');
      logger.info(`User ${userId} earned +${xpGained} XP. New XP: ${newXp}, Level: ${newLevel}`);
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to add XP to user ${userId}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete a user profile
   */
  async softDeleteUser(id) {
    const sql = `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    const { rows } = await db.query(sql, [id]);
    if (rows[0]) {
      logger.info(`User soft-deleted successfully: ID ${id}`);
    }
    return rows[0] || null;
  }
}

module.exports = new UserService();
