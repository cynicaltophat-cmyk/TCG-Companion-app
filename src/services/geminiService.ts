import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { GundamCard, ArtVariantType, ALL_SETS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cache for card prices to speed up repeated lookups
const priceCache: Record<string, { price: string; timestamp: number }> = {};
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

// Load cache from localStorage on init
try {
  const savedCache = localStorage.getItem('gundam_price_cache');
  if (savedCache) {
    const parsed = JSON.parse(savedCache);
    const now = Date.now();
    // Filter out expired entries
    Object.keys(parsed).forEach(key => {
      if (now - parsed[key].timestamp < CACHE_EXPIRY) {
        priceCache[key] = parsed[key];
      }
    });
  }
} catch (e) {
  console.error("Failed to load price cache", e);
}

function saveCache() {
  try {
    localStorage.setItem('gundam_price_cache', JSON.stringify(priceCache));
  } catch (e) {
    console.error("Failed to save price cache", e);
  }
}

export interface IdentifiedCard {
  card: GundamCard;
  isAlt: boolean;
}

export async function analyzeCardImage(base64Image: string): Promise<Partial<GundamCard> | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Analyze this Gundam TCG card and extract all its details. "
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
        systemInstruction: `You are a Gundam TCG expert. Your task is to extract all details from a card image.
        
        Fields to extract:
        - name: The card's name.
        - cardNumber: The card's number (e.g., ST01-001, GD01-045).
        - type: An array of strings. Choose from: "Unit", "Pilot", "Command", "Base". A card can have multiple types (e.g., both "Pilot" and "Command").
        - color: One of "Red", "Blue", "Green", "White", "Black", "Yellow", "Purple".
        - rarity: One of "C", "U", "R", "SR", "UR", "LR".
        - cost: The numeric cost.
        - level: The numeric level (if applicable).
        - ap: The numeric attack power (if applicable).
        - hp: The numeric health points (if applicable).
        - ability: The full text of the card's ability/effect.
        - traits: An array of strings representing the card's traits (e.g., ["MS", "Gundam", "Earth Federation"]).
        - zones: An array of strings representing the card's zones. Choose from: "Earth", "Space".
        - set: The set code. Choose from these valid sets: ${ALL_SETS.join(", ")}.
        
        Return ONLY a JSON object matching this structure:
        {
          "name": "string",
          "cardNumber": "string",
          "type": ["Unit" | "Pilot" | "Command" | "Base"],
          "color": "Red" | "Blue" | "Green" | "White" | "Black" | "Yellow" | "Purple",
          "rarity": "C" | "U" | "R" | "SR" | "UR" | "LR",
          "cost": number,
          "level": number,
          "ap": number,
          "hp": number,
          "ability": "string",
          "traits": ["string"],
          "zones": ["Earth" | "Space"],
          "set": "string"
        }`,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const text = response.text?.trim() || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing card image:", error);
    return null;
  }
}

export async function identifyCard(base64Image: string, cards: GundamCard[]): Promise<IdentifiedCard | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Identify the Gundam TCG card in this image. Focus on the card number (e.g., ST01-001, GD01-045) and the card name. The card number is the most important field for identification."
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
        systemInstruction: "You are a Gundam TCG expert. Identify the card name, card number, and whether it is base or alt art.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cardNumber: { type: Type.STRING },
            version: { 
              type: Type.STRING,
              enum: ["base", "alt"]
            }
          },
          required: ["name", "cardNumber", "version"]
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text);
    
    if (!result.cardNumber && !result.name) return null;

    // Try to find the card in our database
    const found = cards.find(c => {
      if (result.cardNumber) {
        const targetNum = result.cardNumber.toLowerCase();
        const cardNum = c.cardNumber.toLowerCase();
        if (cardNum === targetNum) return true;
        
        // Try normalized match (remove hyphens/spaces)
        const normalizedTarget = targetNum.replace(/[^a-z0-9]/g, '');
        const normalizedCard = cardNum.replace(/[^a-z0-9]/g, '');
        if (normalizedCard === normalizedTarget) return true;
      }
      
      if (result.name && c.name.toLowerCase() === result.name.toLowerCase()) return true;
      
      return false;
    });

    if (found) {
      return {
        card: found,
        isAlt: result.version === "alt"
      };
    }

    return null;
  } catch (error) {
    console.error("Error identifying card:", error);
    return null;
  }
}

export function getCachedPrice(cardNumber: string, cardName: string, artType: ArtVariantType = "Base art"): string | null {
  const cacheKey = `${cardNumber}_${cardName}_${artType}`;
  const entry = priceCache[cacheKey];
  if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY) {
    return entry.price;
  }
  return null;
}

// Queue for price fetching to prevent rate limiting
const priceQueue: (() => Promise<void>)[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || priceQueue.length === 0) return;

  const nextRequest = priceQueue.shift();
  if (nextRequest) {
    activeRequests++;
    await nextRequest();
    // Add a small delay after each request to be polite to the server
    await new Promise(resolve => setTimeout(resolve, 800));
    activeRequests--;
    processQueue();
  }
}

export async function getCardPrice(
  cardNumber: string, 
  cardName: string, 
  forceRefresh = false, 
  artType: ArtVariantType = "Base art"
): Promise<string | null> {
  // Automatic price fetching disabled due to Vercel blocking Yuyutei
  // Users can still view prices via the direct link in card details
  return null;

  /* Original fetching logic disabled:
  // Check cache first unless forcing refresh
  const cacheKey = `${cardNumber}_${cardName}_${artType}`;
  if (!forceRefresh && priceCache[cacheKey]) {
    const entry = priceCache[cacheKey];
    if (Date.now() - entry.timestamp < CACHE_EXPIRY) {
      return entry.price;
    }
  }

  return new Promise((resolve) => {
    const request = async () => {
      try {
        const response = await fetch(`/api/yuyutei-price?cardNumber=${encodeURIComponent(cardNumber)}&artType=${encodeURIComponent(artType)}`);
        
        if (!response.ok) {
          let errorMsg = `Status ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch (e) {
            errorMsg = response.statusText || errorMsg;
          }
          if (!errorMsg || errorMsg === "undefined") errorMsg = `Status ${response.status}`;
          throw new Error(`Failed to fetch price: ${errorMsg}`);
        }

        const data = await response.json();
        const price = data.price;

        if (price && price.startsWith('¥')) {
          // Update cache
          priceCache[cacheKey] = {
            price,
            timestamp: Date.now()
          };
          saveCache();
          resolve(price);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error("Error fetching card price:", error);
        resolve(null);
      }
    };

    priceQueue.push(request);
    processQueue();
  });
  */
}
