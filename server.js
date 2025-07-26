const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI, Modality } = require("@google/genai");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('generated'));

const API_KEY = "AIzaSyCWsMQJe8OWdjfhjfLxlf84D-W5UXsTTSI";

if (!fs.existsSync('./generated')) {
    fs.mkdirSync('./generated');
}

async function generateImageFromGemini(imageUrl) {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType = response.headers.get("content-type") || "image/jpeg";

        const imagePart = {
            inlineData: {
                mimeType: contentType,
                data: base64,
            },
        };

        const contents = [
            {
                role: "user",
                parts: [
                    {
                        text: "edit all people in this image into black person",
                    },
                    imagePart,
                ],
            },
        ];

        const genResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: contents,
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        for (const part of genResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const buffer = Buffer.from(imageData, "base64");
                const fileName = `generated_${Date.now()}.png`;
                const filePath = path.join('./generated', fileName);
                
                fs.writeFileSync(filePath, buffer);
                console.log(`Image saved as ${filePath}`);
                
                return {
                    success: true,
                    imagePath: fileName,
                    text: genResponse.candidates[0].content.parts.find(p => p.text)?.text || ""
                };
            }
        }

        throw new Error('No image generated');
    } catch (error) {
        console.error("Error generating image from Gemini API:", error);
        throw error;
    }
}

app.post('/generate', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        console.log('Generating image for:', imageUrl);
        const result = await generateImageFromGemini(imageUrl);
        
        res.json(result);
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message 
        });
    }
});

app.get('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'generated', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Image not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log('Ready to generate images with Gemini API');
});