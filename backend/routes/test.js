const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Test = require('../models/Test');

// Save a test result
router.post('/', auth, async (req, res) => {
    try {
        const { topic, questions, score, timeTaken, weakAreas } = req.body;

        const newTest = new Test({
            userId: req.user.id,
            topic,
            questions,
            results: {
                score,
                timeTaken: timeTaken || 0,
                weakAreas: weakAreas || []
            }
        });

        const savedTest = await newTest.save();
        res.status(201).json(savedTest);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error saving test' });
    }
});

// Get user's past tests
router.get('/history', auth, async (req, res) => {
    try {
        const tests = await Test.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error fetching test history' });
    }
});

module.exports = router;
