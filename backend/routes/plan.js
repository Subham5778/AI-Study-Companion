const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const StudyPlan = require('../models/StudyPlan');
const User = require('../models/User');
const Analytics = require('../models/Analytics');

// Get Today's Plan
router.get('/daily', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const plans = await StudyPlan.find({
            userId: req.user.id,
            scheduledDate: { $gte: today, $lt: tomorrow }
        });

        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get All Plans
router.get('/all', auth, async (req, res) => {
    try {
        const plans = await StudyPlan.find({ userId: req.user.id }).sort({ scheduledDate: 1 });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Manual Task
router.post('/task', auth, async (req, res) => {
    try {
        const { topic, difficulty, linkName, linkUrl, groupId, groupName } = req.body;
        
        if (!topic) {
            return res.status(400).json({ message: 'Topic is required' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newTask = new StudyPlan({
            userId: req.user.id,
            topic,
            difficulty: difficulty || 'Medium',
            scheduledDate: today,
            status: 'pending',
            source: 'manual',
            groupId: groupId || null,
            groupName: groupName || null,
            linkName: linkName || '',
            linkUrl: linkUrl || ''
        });

        await newTask.save();
        res.json(newTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Task Status
router.patch('/task/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const plan = await StudyPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Task not found' });
        
        if (plan.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Gamification logic if completed
        if (status === 'completed' && plan.status !== 'completed') {
            const user = await User.findById(req.user.id);
            user.xp += 10; // Add XP
            
            // Level up logic (simplified)
            if (user.xp >= user.level * 100) {
                user.level += 1;
                // Add badge if applicable
                if (user.level === 5) user.badges.push('Consistent Learner');
                if (user.level === 10) user.badges.push('Placement Ready');
            }
            await user.save();

            // Update Analytics
            const todayStr = new Date().toISOString().split('T')[0];
            let analytics = await Analytics.findOne({ userId: req.user.id, date: todayStr });
            if (!analytics) {
                analytics = new Analytics({ userId: req.user.id, date: todayStr, tasksCompleted: 1 });
            } else {
                analytics.tasksCompleted += 1;
            }
            await analytics.save();
        }

        plan.status = status;
        await plan.save();

        res.json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a single task
router.delete('/task/:id', auth, async (req, res) => {
    try {
        const plan = await StudyPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Task not found' });
        if (plan.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Unauthorized' });
        await plan.deleteOne();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete all tasks in an AI group
router.delete('/group/:groupId', auth, async (req, res) => {
    try {
        await StudyPlan.deleteMany({ userId: req.user.id, groupId: req.params.groupId });
        res.json({ message: 'Group deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
