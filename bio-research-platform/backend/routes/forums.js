const express = require('express');
const router = express.Router();
const Forum = require('../models/Forum');
const { protect } = require('../middleware/auth');

const ALLOWED_CATEGORIES = ['Biology', 'Medical Physics', 'Biophysics', 'General Discussion', 'Other'];

// @route   GET /api/forums
// @desc    Get all forum topics with search, category, and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search && search.trim()) {
      // Use MongoDB full-text search index (safe - no user data in query operators)
      query.$text = { $search: search.trim().slice(0, 200) };
    }

    const validCategory = ALLOWED_CATEGORIES.find((c) => c === category);
    if (validCategory) {
      query.category = validCategory;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Forum.countDocuments(query);
    const topics = await Forum.find(query)
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-replies');

    res.json({
      success: true,
      data: {
        topics,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get forums error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/forums/:id
// @desc    Get single forum topic, increment views
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const topic = await Forum.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'username avatar bio expertise')
      .populate('replies.author', 'username avatar');

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }

    res.json({ success: true, data: { topic } });
  } catch (error) {
    console.error('Get topic error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/forums
// @desc    Create a new forum topic
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const tagsArray = tags
      ? Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const topic = await Forum.create({
      title,
      content,
      category: category || 'General Discussion',
      author: req.user._id,
      tags: tagsArray,
    });

    const populated = await Forum.findById(topic._id).populate('author', 'username avatar');
    res.status(201).json({ success: true, data: { topic: populated } });
  } catch (error) {
    console.error('Create forum error:', error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/forums/:id
// @desc    Edit forum topic (only author)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const topic = await Forum.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }

    if (topic.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this topic' });
    }

    const { title, content, category, tags } = req.body;
    if (title !== undefined) topic.title = title;
    if (content !== undefined) topic.content = content;
    if (category !== undefined) topic.category = category;
    if (tags !== undefined) {
      topic.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    await topic.save();
    const updated = await Forum.findById(topic._id).populate('author', 'username avatar');
    res.json({ success: true, data: { topic: updated } });
  } catch (error) {
    console.error('Update forum error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/forums/:id
// @desc    Delete forum topic (only author)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const topic = await Forum.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }

    if (topic.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this topic' });
    }

    await topic.deleteOne();
    res.json({ success: true, message: 'Forum topic deleted' });
  } catch (error) {
    console.error('Delete forum error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/forums/:id/replies
// @desc    Add reply to a forum topic
// @access  Private
router.post('/:id/replies', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    const topic = await Forum.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }

    topic.replies.push({
      author: req.user._id,
      content: content.trim(),
      votes: [],
      createdAt: new Date(),
    });

    await topic.save();

    const updated = await Forum.findById(topic._id)
      .populate('author', 'username avatar')
      .populate('replies.author', 'username avatar');

    res.status(201).json({ success: true, data: { topic: updated } });
  } catch (error) {
    console.error('Add reply error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/forums/:id/vote
// @desc    Toggle vote on a forum topic
// @access  Private
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const topic = await Forum.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }

    const userId = req.user._id.toString();
    const hasVoted = topic.votes.map((id) => id.toString()).includes(userId);

    if (hasVoted) {
      await Forum.findByIdAndUpdate(req.params.id, { $pull: { votes: req.user._id } });
      return res.json({ success: true, data: { voted: false, message: 'Vote removed' } });
    } else {
      await Forum.findByIdAndUpdate(req.params.id, { $addToSet: { votes: req.user._id } });
      return res.json({ success: true, data: { voted: true, message: 'Vote added' } });
    }
  } catch (error) {
    console.error('Vote forum error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Forum topic not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
