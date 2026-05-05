import { GoogleGenAI, Type } from "@google/genai";
import { GundamCard, ArtVariantType, ALL_SETS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface IdentifiedCard {
  card: GundamCard;
  isAlt: boolean;
  isVirtual?: boolean;
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const errorMsg = (error?.message || "").toLowerCase();
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 ||
        errorMsg.includes('429') || 
        errorMsg.includes('quota') ||
        errorMsg.includes('resource_exhausted') ||
        errorStr.includes('429') ||
        errorStr.includes('quota');

      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`Gemini Rate Limit (429) hit attempt ${i + 1}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for AI operation due to rate limits.');
}

export async function analyzeCardImage(base64Image: string): Promise<Partial<GundamCard> | null> {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Analyze this Gundam TCG card and extract all its details. Be extremely precise with alphanumeric codes, names, and abilities. Look at the bottom corners for the card number."
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: `You are a Gundam TCG expert researcher. Your task is to extract every detail from a card image with 100% accuracy. 
        
        CRITICAL: If the card text is in Japanese, translate the card name, abilities, and traits to natural-sounding English.
        
        Card numbers (e.g., ST01-001, GD01-044) are the highest priority. Look closely at small text.
        
        Fields to extract:
        - name: The card's name.
        - cardNumber: The card's number (e.g., ST01-001, GD01-045).
        - type: An array of strings. Choose from: "Unit", "Pilot", "Command", "Base".
        - color: One of "Red", "Blue", "Green", "White", "Black", "Yellow", "Purple". 
          CRITICAL: Always determine color by the BAR/BORDER color (left side and corners). 
          Gundam TCG uses a specific magenta/dark pink tone for "Red" in many sets (especially Neo Zeon). 
          DO NOT identify these as "Purple". "Purple" is rarely used and is a much darker, pure violet. 
          If you see a magenta or dark pink border, it is "Red".
        - rarity: One of "C", "U", "R", "SR", "UR", "LR".
        - cost: The numeric cost.
        - level: The numeric level.
        - ap: The numeric attack power.
        - hp: The numeric health points.
        - ability: The full text of the card's ability/effect.
        - traits: An array of strings representing the card's traits.
        - zones: An array of strings representing the card's zones. Choose from: "Earth", "Space".
        - set: The set code. Choose from these valid sets: ${ALL_SETS.join(", ")}.
        
        Return ONLY a JSON object.`,
        responseMimeType: "application/json"
      }
    }));

    const text = response.text?.trim() || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing card image:", error);
    return null;
  }
}

export async function identifyCard(base64Image: string, cards: GundamCard[]): Promise<IdentifiedCard | null> {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Identify and analyze this Gundam TCG card.
              
              YOUR GOAL: 
              1. Extract exact Card Number (e.g., ST01-001, GD01-044).
              2. Translate Card Name, abilities, and traits to English.
              3. Identify version ('base' or 'alt').
              4. Extract ALL other fields (color, cost, level, ap, hp, type, rarity, set, ability) in case it's not in the database.`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: `You are a world-class Gundam TCG identifier. You excel at reading small text and translating Japanese card text to natural English.
        
        Return a JSON object with these fields:
        - name: string (English)
        - cardNumber: string
        - version: "base" | "alt"
        - fullDetails: Object containing ALL fields found in a GundamCard (set, type, color, rarity, cost, level, ap, hp, ability, traits, zones)
        
        Valid sets: ${ALL_SETS.join(", ")}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cardNumber: { type: Type.STRING },
            version: { 
              type: Type.STRING,
              enum: ["base", "alt"]
            },
            fullDetails: {
              type: Type.OBJECT,
              properties: {
                set: { type: Type.STRING },
                type: { type: Type.ARRAY, items: { type: Type.STRING } },
                color: { type: Type.STRING },
                rarity: { type: Type.STRING },
                cost: { type: Type.NUMBER },
                level: { type: Type.NUMBER },
                ap: { type: Type.NUMBER },
                hp: { type: Type.NUMBER },
                ability: { type: Type.STRING },
                traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                zones: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          required: ["name", "cardNumber", "version"]
        }
      }
    }));

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text);
    
    if (!result.cardNumber && !result.name) return null;

    // Try to find the card in our database
    let found = cards.find(c => {
      if (!result.cardNumber) return false;
      const targetNum = result.cardNumber.toLowerCase();
      const cardNum = c.cardNumber.toLowerCase();
      if (cardNum === targetNum) return true;
      
      const normalizedTarget = targetNum.replace(/[^a-z0-9]/g, '');
      const normalizedCard = cardNum.replace(/[^a-z0-9]/g, '');
      
      return normalizedCard === normalizedTarget || 
             normalizedCard.includes(normalizedTarget) || 
             normalizedTarget.includes(normalizedCard);
    });

    if (!found && result.name) {
      const normalizedResultName = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameMatches = cards.filter(c => {
        const cardName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cardName === normalizedResultName;
      });
      
      if (nameMatches.length === 1) {
        found = nameMatches[0];
      } else if (nameMatches.length > 1 && result.cardNumber) {
        const targetNum = result.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        found = nameMatches.find(c => {
          const cardNum = c.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cardNum.includes(targetNum) || targetNum.includes(cardNum);
        });
      }
    }

    if (found) {
      return {
        card: found,
        isAlt: result.version === "alt"
      };
    }

    // Fallback: If not in database, use the fullDetails we already extracted in the same pass!
    if (result.fullDetails) {
      const fd = result.fullDetails;
      const virtualCard: GundamCard = {
        id: `virtual_${result.cardNumber?.toLowerCase() || Math.random().toString(36).substr(2, 9)}`,
        name: result.name || "Unknown Gundam Card",
        cardNumber: result.cardNumber || "Unknown",
        set: fd.set || "Unknown",
        type: fd.type as any || ["Unit"],
        color: fd.color as any || "Blue",
        rarity: fd.rarity as any || "C",
        cost: fd.cost || 0,
        level: fd.level || 0,
        ap: fd.ap || 0,
        hp: fd.hp || 0,
        ability: fd.ability || "Ability text not clearly extracted.",
        imageUrl: `data:image/jpeg;base64,${base64Image}`,
        traits: fd.traits || [],
        zones: fd.zones || []
      };

      return {
        card: virtualCard,
        isAlt: result.version === "alt",
        isVirtual: true
      };
    }

    return null;
  } catch (error) {
    console.error("Error identifying card:", error);
    return null;
  }
}
