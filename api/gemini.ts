import { GoogleGenAI, Type } from "@google/genai";
import express from "express";

const router = express.Router();

// Initialize Gemini with the server-side only API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

router.post("/api/gemini/analyze-image", async (req, res) => {
  const { base64Image, systemInstruction } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  if (!base64Image) {
    return res.status(400).json({ error: "base64Image is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            { text: `Analyze this Gundam TCG card image. ${systemInstruction || ""}` }
          ]
        }
      ]
    });

    const text = response.text?.trim() || "{}";
    try {
      res.json(JSON.parse(text));
    } catch (e) {
      // In case Gemini returns markdown or plain text instead of raw JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
      } else {
        res.json({ text });
      }
    }
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image" });
  }
});

router.post("/api/gemini/identify-card", async (req, res) => {
  const { base64Image, systemInstruction, responseSchema } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  if (!base64Image) {
    return res.status(400).json({ error: "base64Image is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            { text: `Identify this card. ${systemInstruction || ""}` }
          ]
        }
      ]
    });

    const text = response.text?.trim() || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini identification error:", error);
    res.status(500).json({ error: error.message || "Failed to identify card" });
  }
});

export default router;
