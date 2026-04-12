const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title must not exceed 200 characters'],
  },
  abstract: {
    type: String,
    required: [true, 'Abstract is required'],
    trim: true,
    maxlength: [3000, 'Abstract must not exceed 3000 characters'],
  },
  authors: {
    type: [String],
    required: [true, 'At least one author is required'],
    validate: {
      validator: function (arr) {
        return arr.length > 0;
      },
      message: 'At least one author is required',
    },
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Biology', 'Medical Physics', 'Biophysics', 'Other'],
      message: 'Category must be one of: Biology, Medical Physics, Biophysics, Other',
    },
  },
  tags: {
    type: [String],
    default: [],
  },
  fileUrl: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  downloads: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Text index for search (title, abstract, authors, tags)
researchSchema.index({ title: 'text', abstract: 'text', authors: 'text', tags: 'text' });

module.exports = mongoose.model('Research', researchSchema);
