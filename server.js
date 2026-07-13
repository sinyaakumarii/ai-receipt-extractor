// server.js
require('dotenv').config(); // Load variables from the .env file
const express = require('express');
const { completeWithRetry } = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Homepage Route (Fixes "Cannot GET /")
app.get('/', (req, res) => {
    res.send("🚀 Server is up and running! Send a POST request to /api/extract-receipt to extract data.");
});

// 2. Main API Route for AI Receipt Extraction
app.post('/api/extract-receipt', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Please provide 'text' in the request body." });
    }

    try {
        const extractedData = await completeWithRetry(text);
        res.status(200).json({ success: true, data: extractedData });
    } catch (error) {
        console.error("Endpoint Error:", error.message);
        res.status(502).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server successfully running on http://localhost:${PORT}`);
});