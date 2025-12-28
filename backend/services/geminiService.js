require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use the latest stable Flash model (Gemini 2.5 Flash)
const MODEL_NAME = "gemini-2.5-flash";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY is missing in .env file");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Model configured specifically for JSON extraction
const jsonModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
        responseMimeType: "application/json"
    }
});

// Model configured for general text (Insights)
const textModel = genAI.getGenerativeModel({
    model: MODEL_NAME
});

exports.parseExpense = async (text) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const prompt = `
    Extract expense information from: "${text}"
    
    Return a JSON object with these exact fields:
    {
        "amount": <number>,
        "category": "<one of: Food, Travel, Bills, Shopping, Others>",
        "date": "<YYYY-MM-DD format>",
        "description": "<short text>"
    }
    
    Date parsing rules:
    - "today" or no date mentioned → use: ${todayStr}
    - "yesterday" → use: ${yesterdayStr}
    - Specific date like "14 Dec" → convert to current year: 2025-12-14
    - If unclear → use: ${todayStr}
    
    Example: "lunch 150 yesterday" should return:
    {"amount": 150, "category": "Food", "date": "${yesterdayStr}", "description": "lunch"}
    `;

    try {
        const result = await jsonModel.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini Parsing Error:", error.message);
        throw new Error('Failed to parse expense: ' + error.message);
    }
};

exports.generateInsights = async (summaryData) => {
    const prompt = `
    Analyze this student expense summary and provide 3 short, actionable insights (max 50 words total).
    
    Data:
    Total Spent: ${summaryData.totalAmount}
    Category Totals: ${JSON.stringify(summaryData.categoryTotals)}
    Transactions: ${summaryData.expenseCount}
    `;

    try {
        const result = await textModel.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Insights Error:", error);
        return "Insight generation currently unavailable.";
    }
};