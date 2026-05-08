const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/errorHandler');

// ============================================================
// ROUTE IMPORTS
// ============================================================
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);


app.get('/deployment-check', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: '✅ Backend deployed successfully on Vercel',
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ Deployment failed',
      error: error.message
    });
  }
});

app.get('/db-check', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    res.json({
      success: true,
      message: 'Database connected successfully',
      time: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'DB connection failed',
      error: error.message
    });
  }
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ============================================================
// RATE LIMITING
// ============================================================
const limiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) ||
    15 * 60 * 1000,

  max:
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) ||
    100,

  message: {
    success: false,
    message:
      'Too many requests, please try again later.'
  },

  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  message: {
    success: false,
    message:
      'Too many login attempts, please try again later.'
  }
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

// ============================================================
// BODY PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ============================================================
// LOGGING
// ============================================================
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============================================================
// HEALTH ROUTES
// ============================================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 SADAS Backend Running Successfully',
    environment:
      process.env.NODE_ENV || 'development',

    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SADAS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SADAS API is healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/vercel-check', (req, res) => {
  res.status(200).json({
    success: true,
    message: '✅ Backend deployed successfully on Vercel',
    environment:
      process.env.NODE_ENV || 'development',

    timestamp: new Date().toISOString()
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);

app.use('/api/student', studentRoutes);

app.use('/api/admin', adminRoutes);

// Analytics routes
app.use(
  '/api/analytics',
  require('./routes/adminRoutes')
);

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(notFound);

app.use(errorHandler);

module.exports = app;