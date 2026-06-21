const { Pool } = require('pg');
const logger = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'carbon_footprint_tracker',
  max: 20, // Max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database client error in connection pool', err);
});

module.exports = {
  /**
   * Reusable query helper
   * @param {string} text - SQL query text
   * @param {Array} params - Parameter bindings
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rowsCount: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query execution failure', { text, error: error.message });
      throw error;
    }
  },

  /**
   * Get a client connection from pool (useful for transactions)
   */
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds to guard against resource leaks
    const timeout = setTimeout(() => {
      logger.warn('A database client was checked out for more than 5 seconds! Release forced.');
    }, 5000);

    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };

    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client);
    };

    return client;
  },

  /**
   * Check connection status
   */
  checkConnection: async () => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (err) {
      logger.error('PostgreSQL Connection Pool health check failure', err);
      return false;
    }
  },

  /**
   * Close connection pool (useful for testing/graceful shutdown)
   */
  closePool: async () => {
    logger.info('Closing database connection pool');
    await pool.end();
  }
};
