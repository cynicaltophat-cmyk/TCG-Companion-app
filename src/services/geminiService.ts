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

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let delay = 2000;
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
      model: "gemini-3.1-pro-preview",
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
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
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
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            {
              text: `Identify the Gundam TCG card in this image. 
              
              YOUR GOAL: 
              1. Extract the exact Card Number (e.g., ST01-001, GD01-044) from the corners.
              2. Translate the Card Name to English (e.g., if it's 'クシャトリヤ', translate to 'Kshatriya').
              3. Identify if the version is 'base' or 'alt' (alternative art/parallel).
              
              CRITICAL: 
              - Card Number is the absolute most reliable field. 
              - Many cards share names (like 'Kshatriya'), so you MUST use the Card Number to distinguish them.`
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
        systemInstruction: "You are a world-class Gundam TCG identifier. You excel at reading small, fine text in card corners and matching mecha designs to their correct card numbers. You prioritize exact character matching for card numbers over mecha visual identification.",
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    }));

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text);
    
    if (!result.cardNumber && !result.name) return null;

    // Try to find the card in our database
    // 1. First Pass: Try exact match on Card Number (High Confidence)
    let found = cards.find(c => {
      if (!result.cardNumber) return false;
      const targetNum = result.cardNumber.toLowerCase();
      const cardNum = c.cardNumber.toLowerCase();
      if (cardNum === targetNum) return true;
      
      const normalizedTarget = targetNum.replace(/[^a-z0-9]/g, '');
      const normalizedCard = cardNum.replace(/[^a-z0-9]/g, '');
      return normalizedCard === normalizedTarget;
    });

    // 2. Second Pass: If no card number match, try Name (Lower Confidence, especially for same-name cards)
    if (!found && result.name) {
      const nameMatches = cards.filter(c => c.name.toLowerCase() === result.name.toLowerCase());
      
      if (nameMatches.length === 1) {
        // Only fallback to name if there's exactly one card with that name
        found = nameMatches[0];
      } else if (nameMatches.length > 1 && result.cardNumber) {
        // If multiple cards have the same name, we MUST rely on the card number
        // (Even if non-exact, we can try to find the "best" match among the name candidates)
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

    return null;
  } catch (error) {
    console.error("Error identifying card:", error);
    return null;
  }
}

export function clearPriceCache() {
  try {
    Object.keys(priceCache).forEach(key => delete priceCache[key]);
    localStorage.removeItem('gundam_price_cache');
  } catch (e) {
    console.error("Failed to clear price cache", e);
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
  // Temporary skip for set GD04
  if (cardNumber.startsWith('GD04-')) {
    return null;
  }

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
}
