require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use Gemini 1.5 Flash - more stable and reliable than 2.5-flash
const MODEL_NAME = "gemini-1.5-flash";

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

    // Retry logic with exponential backoff
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await textModel.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`Gemini Insights Error (attempt ${attempt + 1}/${maxRetries}):`, error.message);

            // If it's a 503 or rate limit error and not the last attempt, wait and retry
            if (attempt < maxRetries - 1 && (error.status === 503 || error.status === 429)) {
                const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
        }
    }

    // Fallback: Generate basic insights from the data
    console.log("Generating fallback insights...");
    return generateFallbackInsights(summaryData);
};

// Fallback insights generator when Gemini is unavailable
function generateFallbackInsights(summaryData) {
    const insights = [];
    const { totalAmount, categoryTotals, expenseCount } = summaryData;

    // Find highest spending category
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = ((topAmount / totalAmount) * 100).toFixed(0);
        insights.push(`**High ${topCategory} Spending:** ${topCategory} represents ${percentage}% of total expenses. Consider reducing discretionary spending here.`);
    }

    // Average transaction value
    const avgTransaction = (totalAmount / expenseCount).toFixed(2);
    insights.push(`**Transaction Analysis:** ${expenseCount} transactions averaging ${avgTransaction} each. Track small purchases to identify saving opportunities.`);

    // Budget recommendation
    if (sortedCategories.length > 1) {
        const [secondCategory] = sortedCategories[1];
        insights.push(`**Budget Tips:** Focus on ${sortedCategories[0][0]} and ${secondCategory} categories. Set weekly limits to control spending effectively.`);
    } else {
        insights.push(`**Budget Tips:** Set weekly spending limits and track daily expenses to maintain better financial control.`);
    }

    return insights.join('\n\n');
}