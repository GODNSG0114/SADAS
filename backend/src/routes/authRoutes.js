const express = require('express');
const router = express.Router();
const { register, login, getMe, adminRegister } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);

// Secret admin registration — not exposed on frontend
// URL: POST /api/auth/admin-register/:secretKey
router.post('/admin-register/:secretKey', adminRegister);

module.exports = router;
