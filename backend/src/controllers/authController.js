const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { pool } = require('../config/database');
const { validate } = require('../middleware/errorHandler');

// Validation rules - students only
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 255 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('department').optional().trim().notEmpty(),
  body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @route   POST /api/auth/register
// @access  Public
const register = [
  ...registerValidation,
  validate,
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { name, email, password, department, year, roll_number } = req.body;
      const role = 'student'; // public register is always student

      // Check if user exists
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const userResult = await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email, hashedPassword, role]
      );
      const user = userResult.rows[0];

      // Create student profile
      if (role === 'student') {
        const dept = department || 'Computer Science';
        const yr = year || 1;
        await client.query(
          'INSERT INTO students (user_id, department, year, roll_number) VALUES ($1, $2, $3, $4)',
          [user.id, dept, yr, roll_number || null]
        );
      }

      await client.query('COMMIT');

      const token = generateToken(user);
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user, token }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Register error:', error);
      // Handle unique constraint violations (duplicate email, roll_number, etc.)
      if (error.code === '23505') {
        const field = error.detail?.includes('roll_number') ? 'Roll number'
          : error.detail?.includes('email') ? 'Email'
          : 'A value';
        return res.status(409).json({ success: false, message: `${field} already exists. Please use a different one.` });
      }
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    } finally {
      client.release();
    }
  }
];

// @route   POST /api/auth/login
// @access  Public
const login = [
  ...loginValidation,
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const userResult = await pool.query(
        'SELECT id, name, email, password, role, is_active FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account is inactive. Contact administrator.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      let profileData = {};
      if (user.role === 'student') {
        const studentResult = await pool.query(
          'SELECT id, department, year, cgpa, roll_number FROM students WHERE user_id = $1',
          [user.id]
        );
        if (studentResult.rows.length > 0) profileData = studentResult.rows[0];
      }

      const { password: _pw, ...safeUser } = user;
      const token = generateToken(safeUser);

      res.json({
        success: true,
        message: 'Login successful',
        data: { user: { ...safeUser, ...profileData }, token }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  }
];

// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    let profileData = {};
    if (req.user.role === 'student') {
      const studentResult = await pool.query(
        'SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.user_id = $1',
        [req.user.id]
      );
      profileData = studentResult.rows[0] || {};
    }

    res.json({
      success: true,
      data: { ...req.user, ...profileData }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
  }
};

// @route   POST /api/auth/admin-register/:secretKey
// @access  Secret — only share this URL with admins
const adminRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  validate,
  async (req, res) => {
    const { secretKey } = req.params;
    const ADMIN_SECRET = process.env.ADMIN_REGISTER_SECRET || 'sadas-admin-secret-2024';

    if (secretKey !== ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid secret key.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { name, email, password } = req.body;

      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userResult = await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email, hashedPassword, 'admin']
      );

      await client.query('COMMIT');
      const token = generateToken(userResult.rows[0]);
      res.status(201).json({
        success: true,
        message: 'Admin account created successfully.',
        data: { user: userResult.rows[0], token }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Admin register error:', error);
      res.status(500).json({ success: false, message: 'Admin registration failed.' });
    } finally {
      client.release();
    }
  }
];

module.exports = { register, login, getMe, adminRegister };
