const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Hack to get client? No, standard way is manager.
        // Actually the SDK doesn't expose listModels directly on genAI instance in all versions?
        // Let's use the standard fetch implementation if needed, but wait, the newer SDK might have it.
        // Checking docs... usually it's a separate manager or via client.

        // Let's try to just use a simple fetch to the REST API using the key, to be dependency-agnostic if sdk is weird.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
