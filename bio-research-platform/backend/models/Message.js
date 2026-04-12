const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required'],
  },
  room: {
    type: String,
    required: [true, 'Room is required'],
    enum: {
      values: ['general', 'biology', 'medical-physics', 'biophysics', 'off-topic'],
      message: 'Invalid room. Must be one of: general, biology, medical-physics, biophysics, off-topic',
    },
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message must not exceed 2000 characters'],
  },
  type: {
    type: String,
    enum: ['text', 'file'],
    default: 'text',
  },
  fileUrl: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Automatically populate sender with username and avatar on find queries
messageSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'sender',
    select: 'username avatar',
  });
  next();
});

module.exports = mongoose.model('Message', messageSchema);
