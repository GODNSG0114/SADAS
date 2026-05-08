require('dotenv').config();

const app = require('./app');
const { pool, initializeDatabase } = require('./config/database');

const PORT = process.env.PORT || 5000;

let initialized = false;

// ============================================================
// DATABASE INITIALIZATION
// ============================================================
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

// ============================================================
// LOCAL SERVER
// ============================================================
if (process.env.NODE_ENV !== 'production') {
  init()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('❌ Server startup failed:', error);
    });
}

// ============================================================
// VERCEL SERVERLESS EXPORT
// ============================================================
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