const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const StudyPlan = require('../models/StudyPlan');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // User should provide GEMINI_API_KEY in .env

const buildFallbackInsight = ({ totalHours, totalTasks, activeDays, recentTopics }) => {
    if (Number(totalHours) === 0 && totalTasks === 0) {
        return `You are ready to start fresh today. Pick one small task from ${recentTopics} and complete a focused 25-minute session to build momentum.`;
    }

    return `You have studied ${totalHours} hours, completed ${totalTasks} tasks, and stayed active for ${activeDays} days. Keep the next session focused on ${recentTopics}, then review what you learned before moving ahead.`;
};

const stripMarkdownJson = (text = '') => {
    const trimmed = text.trim();
    if (trimmed.startsWith('```json')) {
        return trimmed.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    if (trimmed.startsWith('```')) {
        return trimmed.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return trimmed;
};

const parseJsonArrayFromText = (text = '') => {
    const cleaned = stripMarkdownJson(text);
    try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : parsed.questions;
    } catch (err) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (!match) throw err;
        return JSON.parse(match[0]);
    }
};

const normalizeQuestion = (question = '') => question.toString().trim().toLowerCase().replace(/\s+/g, ' ');

const getUniqueQuestions = (questions = [], limit = 20) => {
    const seen = new Set();
    return questions
        .map((item) => typeof item === 'string' ? item : item?.question)
        .filter(Boolean)
        .map((question) => question.trim())
        .filter((question) => {
            const normalized = normalizeQuestion(question);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        })
        .slice(0, limit);
};

const rotateNewQuestionsFirst = (questions, previousQuestions = []) => {
    const previous = new Set(getUniqueQuestions(previousQuestions, 50).map(normalizeQuestion));
    return [
        ...questions.filter((question) => !previous.has(normalizeQuestion(question.question))),
        ...questions.filter((question) => previous.has(normalizeQuestion(question.question)))
    ];
};

const buildFallbackTest = ({ topic, difficulty = 'Medium', type = 'MCQ', questionCount = 5, previousQuestions = [] }) => {
    const count = Math.max(1, Math.min(Number(questionCount) || 5, 10));
    if (type === 'Coding') {
        const codingPrompts = [
            `Design and implement an algorithm that solves a realistic ${topic} problem. Include edge cases and complexity analysis.`,
            `Debug a flawed ${topic} solution, explain the bug, and provide the corrected approach with complexity.`,
            `Given a dataset related to ${topic}, choose the best data structure or algorithm and justify your trade-offs.`,
            `Optimize a brute-force ${topic} solution into a more efficient one and explain each improvement.`,
            `Write a function for a placement-style ${topic} scenario and describe how you would test it.`,
            `Compare two possible solutions for a ${topic} problem and choose the better one for large inputs.`,
            `Create test cases for a tricky ${topic} implementation and explain what each case proves.`,
            `Refactor a working ${topic} solution to improve readability without changing its complexity.`,
            `Solve a ${topic} problem where the obvious approach fails on one hidden edge case.`,
            `Explain how you would handle invalid input, empty input, and maximum constraints in a ${topic} solution.`
        ];

        const questions = codingPrompts.map((prompt, index) => ({
            question: `${codingPrompts[index % codingPrompts.length]} Problem ${index + 1}.`,
            options: [],
            correctAnswer: `A strong answer should identify the right data structure or algorithm for ${topic}, handle edge cases, and include time and space complexity.`,
            type: 'Coding',
            difficulty
        }));

        return rotateNewQuestionsFirst(questions, previousQuestions).slice(0, count);
    }

    const mcqTemplates = [
        {
            question: `In ${topic}, what is the best first step when solving an unfamiliar problem?`,
            correctAnswer: `Break the problem into definitions, examples, constraints, and edge cases.`
        },
        {
            question: `Which practice helps you avoid common mistakes in ${topic}?`,
            correctAnswer: `Test the idea with small inputs, boundary cases, and one tricky example.`
        },
        {
            question: `Why is complexity or trade-off analysis important in ${topic}?`,
            correctAnswer: `It helps compare valid approaches and choose the one that fits the constraints.`
        },
        {
            question: `What should you do after learning a concept in ${topic}?`,
            correctAnswer: `Apply it to varied problems so you can recognize when the concept is useful.`
        },
        {
            question: `Which answer shows the strongest understanding of ${topic}?`,
            correctAnswer: `Explaining the concept, its use cases, limitations, and an example from memory.`
        },
        {
            question: `What is a good way to revise ${topic} before an interview?`,
            correctAnswer: `Solve mixed questions, review mistakes, and summarize patterns in your own words.`
        },
        {
            question: `When comparing two answers in ${topic}, what should guide your choice?`,
            correctAnswer: `Correctness, constraints, edge cases, readability, and time-space trade-offs.`
        },
        {
            question: `What usually exposes a weak understanding of ${topic}?`,
            correctAnswer: `Being unable to explain why an approach works on edge cases.`
        },
        {
            question: `How should you handle a wrong answer while practicing ${topic}?`,
            correctAnswer: `Trace the mistake, record the pattern, and retry a similar problem later.`
        },
        {
            question: `Which habit makes ${topic} easier to apply under time pressure?`,
            correctAnswer: `Recognizing problem patterns through repeated practice with varied examples.`
        }
    ];

    const questions = mcqTemplates.map((template) => ({
        question: template.question,
        options: [
            template.correctAnswer,
            `${topic} never appears in placement interviews.`,
            `${topic} can be mastered without practice.`,
            `${topic} has no practical applications.`
        ],
        correctAnswer: template.correctAnswer,
        type: 'MCQ',
        difficulty
    }));

    return rotateNewQuestionsFirst(questions, previousQuestions).slice(0, count);
};

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
        const { topic, difficulty, type, questionCount, previousQuestions = [] } = req.body; // type: 'MCQ' or 'Coding'
        
        const count = questionCount || 5;
        const fallbackTest = buildFallbackTest({ topic, difficulty, type, questionCount: count, previousQuestions });

        if (!topic) {
            return res.status(400).json({ message: 'Topic is required.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.json(fallbackTest);
        }

        const questionsToAvoid = getUniqueQuestions(previousQuestions);
        const avoidList = questionsToAvoid.length
            ? `\n\nDo not repeat or lightly rephrase any of these previously generated questions:\n${questionsToAvoid.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
            : '';

        const prompt = `You are an expert examiner. 
        Create a ${difficulty || 'Medium'} difficulty test on the topic "${topic}" with ${count} questions. 
        The test type is ${type || 'MCQ'}.
        Every question must test a different subtopic, scenario, example, or skill. Avoid generic wording and avoid questions that only change a few words from each other.${avoidList}
        
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

        const aiResponseText = response.response.text().trim();
        const testData = parseJsonArrayFromText(aiResponseText);
        
        res.json(Array.isArray(testData) && testData.length > 0 ? testData : fallbackTest);

    } catch (err) {
        console.error('Error generating test, returning fallback:', err.message);
        const { topic, difficulty, type, questionCount, previousQuestions = [] } = req.body || {};
        res.json(buildFallbackTest({ topic: topic || 'this topic', difficulty, type, questionCount, previousQuestions }));
    }
});

// Generate Personalized AI Insights from user analytics
router.post('/generate-insights', auth, async (req, res) => {
    try {
        const { analytics = [], todayPlan = [], userName } = req.body;

        const totalMinutes = analytics.reduce((sum, a) => sum + (a.studyMinutes || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        const totalTasks = analytics.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
        const activeDays = analytics.filter(a => a.studyMinutes > 0).length;
        const recentTopics = (todayPlan || []).map(t => t.topic).join(', ') || 'No tasks yet today';
        const fallbackInsight = buildFallbackInsight({ totalHours, totalTasks, activeDays, recentTopics });

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ insight: fallbackInsight, source: 'fallback' });
        }

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
        const insight = response.response.text().trim() || fallbackInsight;

        res.json({ insight });
    } catch (err) {
        console.error('Error generating insights, returning fallback:', err.message);
        try {
            const { analytics = [], todayPlan = [] } = req.body || {};
            const totalMinutes = analytics.reduce((sum, a) => sum + (a.studyMinutes || 0), 0);
            const totalHours = (totalMinutes / 60).toFixed(1);
            const totalTasks = analytics.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
            const activeDays = analytics.filter(a => a.studyMinutes > 0).length;
            const recentTopics = (todayPlan || []).map(t => t.topic).join(', ') || 'No tasks yet today';
            return res.json({
                insight: buildFallbackInsight({ totalHours, totalTasks, activeDays, recentTopics }),
                source: 'fallback'
            });
        } catch (fallbackErr) {
            return res.json({
                insight: 'Keep studying consistently. Complete one focused task today and build from there.',
                source: 'fallback'
            });
        }
    }
});

module.exports = router;
