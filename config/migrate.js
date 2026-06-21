const fs = require('fs');
const path = require('path');
// Ensure environment is loaded first
require('dotenv').config();

const db = require('./db');
const logger = require('../utils/logger');

async function runMigrations() {
  logger.info('Commencing database migration checks...');
  
  // 1. Initialize schema_migrations table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    logger.error('Failed to initialize schema_migrations table', err);
    process.exit(1);
  }

  // 2. Fetch applied migrations
  let appliedMigrations = new Set();
  try {
    const { rows } = await db.query('SELECT filename FROM schema_migrations');
    rows.forEach(r => appliedMigrations.add(r.filename));
  } catch (err) {
    logger.error('Failed to fetch applied migrations', err);
    process.exit(1);
  }

  // 3. Scan migrations directory
  const migrationsDir = path.join(__dirname, '../db/migrations');
  let files;
  try {
    files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  } catch (err) {
    logger.error(`Failed to scan migrations folder: ${migrationsDir}`, err);
    process.exit(1);
  }

  // 4. Run unapplied migrations inside client transaction
  let client;
  try {
    client = await db.getClient();
  } catch (err) {
    logger.error('Failed to get database client from pool', err);
    process.exit(1);
  }

  try {
    for (const file of files) {
      if (appliedMigrations.has(file)) {
        logger.debug(`Migration already applied: ${file}`);
        continue;
      }

      logger.info(`Applying database migration file: ${file}`);
      const sqlPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      // Execute DDL inside transaction block
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');

      logger.info(`Migration successfully applied: ${file}`);
    }
    
    logger.info('Database migrations verification completed successfully.');
  } catch (err) {
    if (client) {
      logger.warn('Error encountered. Commencing transaction rollback...');
      await client.query('ROLLBACK');
    }
    logger.error('Database migration run execution failure', err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await db.closePool();
  }
}

// Run migrations directly if file is executed from node CLI
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
