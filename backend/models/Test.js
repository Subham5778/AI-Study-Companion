const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    type: { type: String, enum: ['MCQ', 'Coding'], default: 'MCQ' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
  }],
  results: {
    score: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 }, // in seconds
    weakAreas: [{ type: String }]
  }
}, { timestamps: true });

testSchema.index({ userId: 1, topic: 1 });

module.exports = mongoose.model('Test', testSchema);
