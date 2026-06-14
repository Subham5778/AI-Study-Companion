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
  preferences: {
    studyTimePreference: { type: String, enum: ['Morning', 'Afternoon', 'Night', 'Flexible'], default: 'Flexible' },
    difficultyLevel: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
