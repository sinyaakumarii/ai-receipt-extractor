require('dotenv').config(); 
const express = require('express');
const { completeWithRetry } = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Create our API Route
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