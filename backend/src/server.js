require('dotenv').config();
const app = require('./app');
const { pool, initializeDatabase } = require('./config/database');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Create logs directory
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();

    // Initialize database schema
    await initializeDatabase();

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(` Server running on port ${PORT} `);
      console.log(` Environment: ${(process.env.NODE_ENV || 'development').padEnd(32)}`);
      console.log(` API: http://localhost:${PORT}/api`);
      console.log(` Health: http://localhost:${PORT}/health `);
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        pool.end(() => {
          console.log('Database connection closed.');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT received. Shutting down gracefully...');
      server.close(() => {
        pool.end(() => {
          console.log('Database connection closed.');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Please ensure PostgreSQL is running and credentials are correct.');
    process.exit(1);
  }
};

startServer();
