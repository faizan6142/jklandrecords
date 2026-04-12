const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Research = require('../models/Research');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const ALLOWED_CATEGORIES = ['Biology', 'Medical Physics', 'Biophysics', 'Other'];

// @route   GET /api/research
// @desc    Get all research papers with search, category filter, and pagination
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
    const total = await Research.countDocuments(query);
    const papers = await Research.find(query)
      .populate('uploadedBy', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        papers,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get research error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/research/:id
// @desc    Get single research paper, increment downloads count
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const paper = await Research.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 0 } }, // Don't increment on view; increment on explicit download
      { new: true }
    ).populate('uploadedBy', 'username avatar bio expertise');

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }

    res.json({ success: true, data: { paper } });
  } catch (error) {
    console.error('Get paper error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/research
// @desc    Upload a research paper
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, abstract, authors, category, tags } = req.body;

    if (!title || !abstract || !authors || !category) {
      return res.status(400).json({ success: false, message: 'Title, abstract, authors, and category are required' });
    }

    const authorsArray = Array.isArray(authors)
      ? authors
      : authors.split(',').map((a) => a.trim()).filter(Boolean);

    const tagsArray = tags
      ? Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const paperData = {
      title,
      abstract,
      authors: authorsArray,
      category,
      tags: tagsArray,
      uploadedBy: req.user._id,
    };

    if (req.file) {
      paperData.fileUrl = `/uploads/${req.file.filename}`;
      paperData.fileName = req.file.originalname;
    }

    const paper = await Research.create(paperData);
    const populated = await Research.findById(paper._id).populate('uploadedBy', 'username avatar');

    res.status(201).json({ success: true, data: { paper: populated } });
  } catch (error) {
    console.error('Create research error:', error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/research/:id
// @desc    Edit a research paper (only uploader)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }

    if (paper.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this paper' });
    }

    const { title, abstract, authors, category, tags } = req.body;
    if (title !== undefined) paper.title = title;
    if (abstract !== undefined) paper.abstract = abstract;
    if (authors !== undefined) {
      paper.authors = Array.isArray(authors)
        ? authors
        : authors.split(',').map((a) => a.trim()).filter(Boolean);
    }
    if (category !== undefined) paper.category = category;
    if (tags !== undefined) {
      paper.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    await paper.save();
    const updated = await Research.findById(paper._id).populate('uploadedBy', 'username avatar');
    res.json({ success: true, data: { paper: updated } });
  } catch (error) {
    console.error('Update research error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/research/:id
// @desc    Delete a research paper (only uploader) and remove file from disk
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }

    if (paper.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this paper' });
    }

    // Delete file from disk if it exists
    if (paper.fileUrl) {
      const filePath = path.join(__dirname, '..', paper.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await paper.deleteOne();
    res.json({ success: true, message: 'Research paper deleted' });
  } catch (error) {
    console.error('Delete research error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/research/:id/like
// @desc    Toggle like on a research paper
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }

    const userId = req.user._id.toString();
    const hasLiked = paper.likes.map((id) => id.toString()).includes(userId);

    if (hasLiked) {
      await Research.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } });
      return res.json({ success: true, data: { liked: false, message: 'Like removed' } });
    } else {
      await Research.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } });
      return res.json({ success: true, data: { liked: true, message: 'Paper liked' } });
    }
  } catch (error) {
    console.error('Like research error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Research paper not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/research/:id/download
// @desc    Increment download count
// @access  Public
router.post('/:id/download', async (req, res) => {
  try {
    await Research.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ success: true, message: 'Download count updated' });
  } catch (error) {
    console.error('Download count error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
