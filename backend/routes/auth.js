// server/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { register, login } = require('../controllers/authController');
const { body } = require('express-validator');
const {auth} = require('../middleware/auth');

// in routes: backend/routes/authRoutes.js
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// POST /api/auth/register
router.post('/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').notEmpty()
  ],
  register
);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;