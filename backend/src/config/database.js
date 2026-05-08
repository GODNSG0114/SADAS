const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ensure env vars are loaded before pool is created
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // keep lower for serverless — each invocation gets its own pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});



pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const initializeDatabase = async () => {
  // Schema auto-init is only run locally; in production apply migrations manually
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️  Production mode: skipping schema auto-init');
    return;
  }
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);
      console.log('✅ Database schema initialized successfully');
    }
  } catch (err) {
    console.error('❌ Error initializing database schema:', err.message);
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
