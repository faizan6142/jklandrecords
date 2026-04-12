const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Helper: format validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  return null;
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errResponse = handleValidationErrors(req, res);
    if (errResponse) return errResponse;

    const { username, email, password, bio, expertise } = req.body;

    try {
      const existingEmail = await User.findOne({ email: String(email).toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }

      const existingUsername = await User.findOne({ username: String(username) });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }

      const user = await User.create({
        username,
        email,
        password,
        bio: bio || '',
        expertise: Array.isArray(expertise)
          ? expertise
          : expertise
          ? expertise.split(',').map((e) => e.trim()).filter(Boolean)
          : [],
      });

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            expertise: user.expertise,
            avatar: user.avatar,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during registration' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user and return token
// @access  Public
router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errResponse = handleValidationErrors(req, res);
    if (errResponse) return errResponse;

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: String(email).toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = generateToken(user._id);

      res.json({
        success: true,
        data: {
          token,
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            expertise: user.expertise,
            avatar: user.avatar,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          expertise: user.expertise,
          avatar: user.avatar,
          followers: user.followers,
          following: user.following,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
