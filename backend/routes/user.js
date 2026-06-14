const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');
const Analytics = require('../models/Analytics');
const Note = require('../models/Note');
const StudyPlan = require('../models/StudyPlan');

// Get User Profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update Preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { studyTimePreference, difficultyLevel } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          'preferences.studyTimePreference': studyTimePreference,
          'preferences.difficultyLevel': difficultyLevel
        }
      },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get User Heatmap/Analytics Data
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = await Analytics.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(analytics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Log Study Time (called by Focus Timer on session complete)
router.post('/analytics/log-time', auth, async (req, res) => {
  try {
    const minutes = parseInt(req.body.minutes);
    if (!minutes || minutes <= 0) return res.status(400).json({ message: 'Invalid minutes' });

    const todayStr = new Date().toISOString().split('T')[0];
    let analytics = await Analytics.findOne({ userId: req.user.id, date: todayStr });
    if (!analytics) {
      analytics = new Analytics({ userId: req.user.id, date: todayStr, studyMinutes: minutes });
    } else {
      analytics.studyMinutes = (analytics.studyMinutes || 0) + minutes;
    }
    await analytics.save();
    res.json({ message: 'Time logged', analytics });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get All Notes
router.get('/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save a New Note
router.post('/notes', auth, async (req, res) => {
  try {
    const { topics, important } = req.body;
    if (!topics) return res.status(400).json({ message: 'Topics are required' });

    const note = new Note({
      userId: req.user.id,
      date: new Date().toISOString().split('T')[0],
      topics,
      important: important || ''
    });
    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Reset User Progress
router.delete('/reset', auth, async (req, res) => {
  try {
    await Analytics.deleteMany({ userId: req.user.id });
    await StudyPlan.deleteMany({ userId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { 
      $set: { xp: 0, level: 1, 'streak.count': 0 }
    });
    res.json({ message: 'Progress reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

