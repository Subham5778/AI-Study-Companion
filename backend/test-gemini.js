require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        console.log("Key starts with:", process.env.GEMINI_API_KEY.substring(0, 5));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const prompt = `You are an expert examiner. 
        Create a Medium difficulty test on the topic "React" with 2 questions. 
        The test type is MCQ.
        
        Format the response as a JSON array where each object represents a question. Only respond with valid JSON containing the array. Do not include markdown formatting like \`\`\`json.
        [
            {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"], // leave empty/null if purely coding
                "correctAnswer": "The exact string of the correct option or the exact code output/logic",
                "type": "MCQ",
                "difficulty": "Medium"
            }
        ]`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: "You are an expert examiner." });
        console.log("Calling model...");
        const response = await model.generateContent(prompt);
        console.log("Response received.");
        
        let aiResponseText = response.response.text().trim();
        console.log("Raw output:");
        console.log(aiResponseText);
        
        if (aiResponseText.startsWith('```json')) {
            aiResponseText = aiResponseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (aiResponseText.startsWith('```')) {
            aiResponseText = aiResponseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const testData = JSON.parse(aiResponseText);
        console.log("Parsed data successfully");
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
