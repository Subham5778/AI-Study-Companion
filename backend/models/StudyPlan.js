const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  subtopics: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'skipped'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  source: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'manual'
  },
  groupId: {
    type: String,
    default: null
  },
  groupName: {
    type: String,
    default: null
  },
  linkName: {
    type: String,
    default: ''
  },
  linkUrl: {
    type: String,
    default: ''
  },
  revisionCycle: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

studyPlanSchema.index({ userId: 1, scheduledDate: 1 });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
