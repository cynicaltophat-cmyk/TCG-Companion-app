import { GundamCard, ArtVariantType, ALL_SETS } from "../types";

// Removed direct GoogleGenAI import and initialization for security
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const response = await callWithRetry(async () => {
      const res = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image,
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
        
        Return ONLY a JSON object.`
        })
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    });

    return response;
  } catch (error) {
    console.error("Error analyzing card image:", error);
    return null;
  }
}

export async function identifyCard(base64Image: string, cards: GundamCard[]): Promise<IdentifiedCard | null> {
  try {
    const response = await callWithRetry(async () => {
      const res = await fetch("/api/gemini/identify-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image,
          systemInstruction: `You are a world-class Gundam TCG identifier. You excel at reading small text and translating Japanese card text to natural English.
        
        Return a JSON object with these fields:
        - name: string (English)
        - cardNumber: string
        - version: "base" | "alt"
        - fullDetails: Object containing ALL fields found in a GundamCard (set, type, color, rarity, cost, level, ap, hp, ability, traits, zones)
        
        Valid sets: ${ALL_SETS.join(", ")}.`,
          responseSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              cardNumber: { type: "string" },
              version: { 
                type: "string",
                enum: ["base", "alt"]
              },
              fullDetails: {
                type: "object",
                properties: {
                  set: { type: "string" },
                  type: { type: "array", items: { type: "string" } },
                  color: { type: "string" },
                  rarity: { type: "string" },
                  cost: { type: "number" },
                  level: { type: "number" },
                  ap: { type: "number" },
                  hp: { type: "number" },
                  ability: { type: "string" },
                  traits: { type: "array", items: { type: "string" } },
                  zones: { type: "array", items: { type: "string" } }
                }
              }
            },
            required: ["name", "cardNumber", "version"]
          }
        })
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    });

    const result = response;
    
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
const MAX_CONCURRENT_REQUESTS = 1;

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || priceQueue.length === 0) return;

  const nextRequest = priceQueue.shift();
  if (nextRequest) {
    activeRequests++;
    await nextRequest();
    // Add a delay after each request to be polite to the server
    await new Promise(resolve => setTimeout(resolve, 1500));
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
  // DISABLING PRICE FETCHING TEMPORARILY AS REQUESTED TO LET YYT COOL DOWN
  return null;

  // Check cache first unless forcing refresh
  const cacheKey = `${cardNumber}_${cardName}_${artType}`;
  if (!forceRefresh && priceCache[cacheKey]) {
    const entry = priceCache[cacheKey];
    if (Date.now() - entry.timestamp < CACHE_EXPIRY) {
      return entry.price;
    }
  }

  return new Promise((resolve) => {
    const request = async (retries = 2) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`/api/yuyutei-price?cardNumber=${encodeURIComponent(cardNumber)}&artType=${encodeURIComponent(artType)}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMsg = `Status ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch (e) {
            errorMsg = response.statusText || errorMsg;
          }
          
          if (response.status === 429 && retries > 0) {
            console.warn(`[Price Fetch] Client 429, retrying for ${cardNumber}...`);
            await new Promise(r => setTimeout(r, 2000));
            return request(retries - 1);
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
      } catch (error: any) {
        if (retries > 0 && (error.name === 'AbortError' || error.message?.includes('Failed to fetch'))) {
          console.warn(`[Price Fetch] Network error/timeout for ${cardNumber}, retrying...`, error.message);
          await new Promise(r => setTimeout(r, 1000));
          return request(retries - 1);
        }
        console.error("Error fetching card price:", error);
        resolve(null);
      }
    };

    priceQueue.push(request);
    processQueue();
  });
}
