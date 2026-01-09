// check-models.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function check() {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("Using API Key:", apiKey ? "Key found (ends in " + apiKey.slice(-4) + ")" : "MISSING");

    try {
        // Use the manual fetch to see the raw list of models allowed for your key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error.message);
            return;
        }

        console.log("\nAvailable models for your API Key:");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name.replace('models/', '')}`);
            }
        });
    } catch (err) {
        console.error("Connection error:", err.message);
    }
}

check();