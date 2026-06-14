require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Wait, listModels isn't exposed directly in GoogleGenerativeAI maybe?
        // But we can do fetch manually.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log(data.models.map(m => m.name).filter(n => n.includes("gemini")));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
