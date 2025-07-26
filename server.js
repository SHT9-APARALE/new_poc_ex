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

// Multiple API keys for parallel processing
const API_KEYS = [
    "AIzaSyD-_C6uibYTehH9XZIF0wvO9tVRcw7rge8",
    "AIzaSyCdcrZf2W2hPgyor0ApGIiJQLJ_DU7h8vY",
    // Add more API keys here for parallel processing
    // "YOUR_SECOND_API_KEY",
    // "YOUR_THIRD_API_KEY",
];

let currentKeyIndex = 0;

// Round-robin API key selection
function getNextApiKey() {
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return key;
}

if (!fs.existsSync('./generated')) {
    fs.mkdirSync('./generated');
}

async function generateImageFromGemini(imageUrl, apiKey = null) {
    try {
        const selectedApiKey = apiKey || getNextApiKey();
        const ai = new GoogleGenAI({ apiKey: selectedApiKey });

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
                const fileName = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
                const filePath = path.join('./generated', fileName);
                
                fs.writeFileSync(filePath, buffer);
                console.log(`Image saved as ${filePath} using API key: ${selectedApiKey.substring(0, 20)}...`);
                
                return {
                    success: true,
                    imagePath: fileName,
                    text: genResponse.candidates[0].content.parts.find(p => p.text)?.text || "",
                    apiKeyUsed: selectedApiKey.substring(0, 20) + "..."
                };
            }
        }

        throw new Error('No image generated');
    } catch (error) {
        console.error("Error generating image from Gemini API:", error);
        throw error;
    }
}

// New endpoint for batch parallel processing
app.post('/generate-batch', async (req, res) => {
    try {
        const { imageUrls } = req.body;
        
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Array of image URLs is required' });
        }

        console.log(`Processing ${imageUrls.length} images in parallel...`);
        
        // Process all images in parallel using different API keys
        const promises = imageUrls.map((imageUrl, index) => {
            const apiKey = API_KEYS[index % API_KEYS.length];
            return generateImageFromGemini(imageUrl, apiKey)
                .then(result => ({ ...result, originalUrl: imageUrl, index }))
                .catch(error => ({ 
                    success: false, 
                    error: error.message, 
                    originalUrl: imageUrl, 
                    index 
                }));
        });

        const results = await Promise.all(promises);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`Batch complete: ${successful.length} successful, ${failed.length} failed`);
        
        res.json({
            success: true,
            results: results,
            summary: {
                total: imageUrls.length,
                successful: successful.length,
                failed: failed.length
            }
        });
    } catch (error) {
        console.error('Batch generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate images in batch',
            details: error.message 
        });
    }
});

// Keep the original single image endpoint
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