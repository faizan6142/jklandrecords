const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Research = require('../models/Research');
const { protect } = require('../middleware/auth');

// Escape special regex characters from user input to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @route   GET /api/users/search?q=
// @desc    Search users by username or expertise
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json({ success: true, data: { users: [] } });
    }

    const safeQuery = escapeRegex(q.trim());
    const regex = new RegExp(safeQuery, 'i');
    const users = await User.find({
      $or: [{ username: regex }, { expertise: regex }],
    })
      .select('-password -followers -following')
      .limit(20);

    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('Search users error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const researchCount = await Research.countDocuments({ uploadedBy: user._id });

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
          researchCount,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update own user profile
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
    }

    const { bio, expertise, avatar } = req.body;
    const updateFields = {};
    if (bio !== undefined) updateFields.bio = bio;
    if (expertise !== undefined) {
      updateFields.expertise = Array.isArray(expertise)
        ? expertise
        : expertise.split(',').map((e) => e.trim()).filter(Boolean);
    }
    if (avatar !== undefined) updateFields.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Toggle follow / unfollow a user
// @access  Private
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(req.params.id);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
      return res.json({ success: true, data: { followed: false, message: 'User unfollowed' } });
    } else {
      // Follow
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id } });
      return res.json({ success: true, data: { followed: true, message: 'User followed' } });
    }
  } catch (error) {
    console.error('Follow error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
