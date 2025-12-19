const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Configuration
const API_KEY = process.env.GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message requis' });
        }

        console.log('🤖 IA Interrogée:', message);

        const response = await axios.post(
            API_URL,
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un coach fitness expert et motivant. Tu parles français. Tu donnes des conseils sur l'entraînement, la nutrition et la santé. Sois concis et encourageant."
                    },
                    { role: "user", content: message }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                }
            }
        );

        const botReply = response.data.choices[0].message.content;

        res.json({
            success: true,
            reply: botReply
        });

    } catch (error) {
        console.error('❌ Erreur IA:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la communication avec le coach IA',
            error: error.message
        });
    }
});

module.exports = router;