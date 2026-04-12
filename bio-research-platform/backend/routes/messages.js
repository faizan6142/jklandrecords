const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const ROOMS = [
  { id: 'general', name: 'General', description: 'General discussion for all topics', icon: '💬' },
  { id: 'biology', name: 'Biology', description: 'Discuss biological research and findings', icon: '🧬' },
  { id: 'medical-physics', name: 'Medical Physics', description: 'Medical physics topics and research', icon: '⚛️' },
  { id: 'biophysics', name: 'Biophysics', description: 'Where biology meets physics', icon: '🔬' },
  { id: 'off-topic', name: 'Off-Topic', description: 'Non-research casual conversation', icon: '☕' },
];

// @route   GET /api/messages/rooms
// @desc    Get list of available rooms with metadata
// @access  Public
router.get('/rooms', (req, res) => {
  res.json({ success: true, data: { rooms: ROOMS } });
});

// @route   GET /api/messages/:room
// @desc    Get messages for a specific room (last 50)
// @access  Public
router.get('/:room', async (req, res) => {
  const validRooms = ROOMS.map((r) => r.id);
  if (!validRooms.includes(req.params.room)) {
    return res.status(400).json({ success: false, message: 'Invalid room' });
  }

  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Return in ascending order (oldest first)
    messages.reverse();

    res.json({ success: true, data: { messages } });
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Create a new message
// @access  Private
router.post('/', protect, async (req, res) => {
  const { room, content, type, fileUrl } = req.body;

  if (!room || !content) {
    return res.status(400).json({ success: false, message: 'Room and content are required' });
  }

  try {
    const message = await Message.create({
      sender: req.user._id,
      room,
      content,
      type: type || 'text',
      fileUrl: fileUrl || '',
    });

    // Fetch populated message
    const populatedMessage = await Message.findById(message._id).lean();

    res.status(201).json({ success: true, data: { message: populatedMessage } });
  } catch (error) {
    console.error('Create message error:', error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message (only sender)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    await message.deleteOne();
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
