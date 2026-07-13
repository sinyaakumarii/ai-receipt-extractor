// ai.js
const { z } = require('zod');

// We define the exact schema we want the AI to return to us
const ReceiptSchema = z.object({
    merchant: z.string(),
    date: z.string(),
    amount: z.number(),
    items: z.array(z.string())
});

const PRICE_INPUT_PER_M = 0.075; 
const PRICE_OUTPUT_PER_M = 0.30;

async function completeWithRetry(userText, retriesLeft = 1) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY in .env file");
    }

    const systemPrompt = `Extract key values from the receipt text. You must return raw JSON matching this schema:
    { "merchant": "string", "date": "YYYY-MM-DD", "amount": 12.34, "items": ["item1", "item2"] }
    Do not output markdown format or code blocks like \`\`\`json. Return ONLY raw JSON text.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { text: `Receipt text: "${userText}"` }
                    ]
                }]
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 400) {
                throw new Error(`API Error (400): Invalid request.`);
            }
            if ((response.status === 429 || response.status >= 500) && retriesLeft > 0) {
                console.log(`⚠️ API issue (${response.status}). Retrying...`);
                return completeWithRetry(userText, retriesLeft - 1);
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Calculate and Log the cost
        const inputTokens = data.usageMetadata?.promptTokenCount || 0;
        const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const cost = ((inputTokens * PRICE_INPUT_PER_M) + (outputTokens * PRICE_OUTPUT_PER_M)) / 1000000;

        console.log(`\n--- [AI Cost Log] ---`);
        console.log(`Tokens used: Input: ${inputTokens} | Output: ${outputTokens}`);
        console.log(`Estimated API Cost: $${cost.toFixed(6)}\n`);

        const rawText = data.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(rawText.trim());
        
        return ReceiptSchema.parse(parsedJson);

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error("The AI request timed out.");
        }

        if ((error instanceof SyntaxError || error.name === 'ZodError') && retriesLeft > 0) {
            console.log("⚠️ Validation failed. Retrying prompt once...");
            return completeWithRetry(userText, retriesLeft - 1);
        }

        throw error;
    }
}

module.exports = { completeWithRetry };