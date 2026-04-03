import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function addCardFromUrl(url: string) {
  try {
    console.log(`Fetching card details from: ${url}`);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the Gundam TCG card details from this URL: ${url}`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cardNumber: { type: Type.STRING },
            type: { type: Type.STRING },
            color: { type: Type.STRING },
            rarity: { type: Type.STRING },
            cost: { type: Type.NUMBER },
            level: { type: Type.NUMBER },
            ap: { type: Type.NUMBER },
            hp: { type: Type.NUMBER },
            ability: { type: Type.STRING },
            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            zones: { type: Type.ARRAY, items: { type: Type.STRING } },
            set: { type: Type.STRING },
            imageUrl: { type: Type.STRING }
          },
          required: ["name", "cardNumber", "type", "color", "rarity", "cost", "ability", "set"]
        }
      },
    });

    const text = response.text?.trim() || "{}";
    const cardData = JSON.parse(text);

    if (!cardData.cardNumber) {
      throw new Error("Failed to extract card details.");
    }

    const id = cardData.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cardToSave = {
      ...cardData,
      id,
      imageUrl: cardData.imageUrl || '',
      traits: cardData.traits || [],
      zones: cardData.zones || [],
      faq: cardData.faq || []
    };

    console.log(`Saving card: ${cardData.name} (${cardData.cardNumber})`);
    await setDoc(doc(db, 'cards', id), cardToSave);
    console.log("Card saved successfully!");
  } catch (error) {
    console.error("Error adding card from URL:", error);
  }
}

addCardFromUrl("https://exburst.dev/gundam/cards/GD04-016");
