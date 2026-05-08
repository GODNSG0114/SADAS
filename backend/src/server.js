require('dotenv').config();

const app = require('./app');
const { pool, initializeDatabase } = require('./config/database');

let initialized = false;

async function init() {
  if (!initialized) {
    console.log('🔌 Connecting to PostgreSQL...');

    const client = await pool.connect();
    console.log('✅ Database connected');

    client.release();

    await initializeDatabase();

    initialized = true;
  }
}

module.exports = async (req, res) => {
  try {
    await init();
    return app(req, res);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};