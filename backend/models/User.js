const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  googleId: {
    type: String
  },
  avatar: {
    type: String,
    default: "https://api.dicebear.com/7.x/bottts/svg?seed=study"
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  badges: [{
    type: String
  }],
  streak: {
    count: { type: Number, default: 0 },
    lastDate: { type: Date }
  },
  hasLoggedInBefore: {
    type: Boolean,
    default: false
  },
  preferences: {
    studyTimePreference: { type: String, enum: ['Morning', 'Afternoon', 'Night', 'Flexible'], default: 'Flexible' },
    difficultyLevel: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
  },
  codingProgress: {
    days: { type: Map, of: Number, default: {} },
    solvedProblems: { type: Array, default: [] },
    dailyQuestions: {
      dateKey: { type: String, default: '' },
      questions: { type: Array, default: [] }
    }
  },
  codingPlatforms: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true }
  }],
  codingDashboard: {
    profiles: { type: Array, default: [] },
    goals: { type: Array, default: [] },
    problemHistory: { type: Array, default: [] },
    notificationPreferences: {
      upcomingContests: { type: Boolean, default: true },
      streakReminders: { type: Boolean, default: true },
      goalCompletion: { type: Boolean, default: true },
      contestResults: { type: Boolean, default: false }
    },
    lastRefreshedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
