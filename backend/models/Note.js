const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  topics: {
    type: String,
    required: true
  },
  important: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
