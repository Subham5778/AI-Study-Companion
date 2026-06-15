const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const StudyPlan = require('../models/StudyPlan');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // User should provide GEMINI_API_KEY in .env

// Generate Personalized Schedule
router.post('/generate-timetable', async (req, res) => {
  try {
    const { syllabus, days } = req.body;
    
    if (!syllabus || !days) {
        return res.status(400).json({ message: "Syllabus and number of days are required." });
    }

    const prompt = `You are an expert AI study mentor.
    Create a detailed daily study plan for ${days} days based on the following syllabus:
    "${syllabus}"
    
    Format the response as a JSON array where each object represents a day's plan. Only respond with valid JSON containing the array. Do not include markdown code block formatting like \`\`\`json.
    [
      {
        "topic": "Main topic for the day",
        "subtopics": ["Subtopic 1", "Subtopic 2"],
        "difficulty": "Easy" // Easy, Medium, Hard
      }
    ]`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: "You are an AI study mentor." });
    const response = await model.generateContent(prompt);
    
    let aiResponseText = response.response.text().trim();
    if (aiResponseText.startsWith('```json')) {
        aiResponseText = aiResponseText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (aiResponseText.startsWith('```')) {
        aiResponseText = aiResponseText.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    const studyPlanData = JSON.parse(aiResponseText);
    
    const savedPlans = [];
    const today = new Date();

    // Unique group for this generation batch
    const groupId = Date.now().toString();
    const groupName = syllabus.split('\n')[0].trim().substring(0, 50) || `Plan ${today.toLocaleDateString()}`;

    // Check for auth header, but don't fail if not present since we might just want the result in frontend without login
    let userId = null;
    if (req.header('Authorization')) {
        try {
            const jwt = require('jsonwebtoken');
            const token = req.header('Authorization').split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.user.id;
        } catch(e) {}
    }

    for (let i = 0; i < studyPlanData.length; i++) {
        const planDate = new Date(today);
        planDate.setDate(today.getDate() + i);
        
        const newPlan = new StudyPlan({
            userId: userId || '000000000000000000000000',
            topic: studyPlanData[i].topic,
            subtopics: studyPlanData[i].subtopics || [],
            difficulty: studyPlanData[i].difficulty || 'Medium',
            scheduledDate: planDate,
            status: 'pending',
            source: 'ai',
            groupId,
            groupName
        });
        
        if (userId) {
           await newPlan.save();
        }
        savedPlans.push({ ...newPlan.toObject(), groupId, groupName });
    }

    res.json(savedPlans);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating timetable', error: err.message });
  }
});

// Generate Test
router.post('/generate-test', async (req, res) => {
    try {
        const { topic, difficulty, type, questionCount } = req.body; // type: 'MCQ' or 'Coding'
        
        const count = questionCount || 5;

        const prompt = `You are an expert examiner. 
        Create a ${difficulty || 'Medium'} difficulty test on the topic "${topic}" with ${count} questions. 
        The test type is ${type || 'MCQ'}.
        
        Format the response as a JSON array where each object represents a question. Only respond with valid JSON containing the array. Do not include markdown formatting like \`\`\`json.
        [
            {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"], // leave empty/null if purely coding
                "correctAnswer": "The exact string of the correct option or the exact code output/logic",
                "type": "${type || 'MCQ'}",
                "difficulty": "${difficulty || 'Medium'}"
            }
        ]`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: "You are an expert examiner." });
        const response = await model.generateContent(prompt);

        let aiResponseText = response.response.text().trim();
        if (aiResponseText.startsWith('```json')) {
            aiResponseText = aiResponseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (aiResponseText.startsWith('```')) {
            aiResponseText = aiResponseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const testData = JSON.parse(aiResponseText);
        
        res.json(testData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating test', error: err.message });
    }
});

// Generate Personalized AI Insights from user analytics
router.post('/generate-insights', auth, async (req, res) => {
    try {
        const { analytics, todayPlan, userName } = req.body;

        const totalMinutes = analytics.reduce((sum, a) => sum + (a.studyMinutes || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        const totalTasks = analytics.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
        const activeDays = analytics.filter(a => a.studyMinutes > 0).length;
        const recentTopics = (todayPlan || []).map(t => t.topic).join(', ') || 'No tasks yet today';

        const prompt = `You are an encouraging AI study mentor for a college student named ${userName || 'the student'} who is preparing for placements.

Based on their study data:
- Total study time this week: ${totalHours} hours
- Total tasks completed overall: ${totalTasks}
- Active study days: ${activeDays}
- Today's scheduled topics: ${recentTopics}

Write a short, motivating, and PERSONALIZED insight (2-3 sentences max) that:
1. Comments on their progress specifically
2. Gives one actionable suggestion based on their data
3. Ends with a motivating line

Be specific, warm, and encouraging. Do NOT be generic. Refer to the actual numbers.`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const insight = response.response.text().trim();

        res.json({ insight });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating insights', error: err.message });
    }
});

module.exports = router;
