import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import apiApp from "./api/index.ts";
import { rateLimit } from "express-rate-limit";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YYT_BASE_URL = "https://yuyu-tei.jp";
const YYT_GAME_ID = "gcg"; // Gundam Card Game abbreviation
const DATA_DIR = path.join(process.cwd(), "data");
const MARKET_FILE = path.join(DATA_DIR, "market.json");

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Referer': 'https://yuyu-tei.jp/',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

function getYYTUrl(set: string): string {
  const s = set.toUpperCase();
  // User provided specific link for GD04
  if (s === "GD04") return `${YYT_BASE_URL}/sell/${YYT_GAME_ID}/s/special/8/`;
  
  if (s.startsWith("ST")) return `${YYT_BASE_URL}/sell/${YYT_GAME_ID}/s/${s.toLowerCase()}/`;
  
  // For boosters, try multiple names: bt01, gd01, gbt01
  // We'll use a specific one for the main URL but the scraper can handle fallbacks
  let slugPart = s.toLowerCase();
  if (s.startsWith("GD")) {
    const num = s.slice(2);
    slugPart = `bt${num}`; // Common pattern
  }
  
  return `${YYT_BASE_URL}/sell/${YYT_GAME_ID}/s/${slugPart}/`;
}

async function fetchSetPrices(set: string) {
  const s = set.toUpperCase();
  // Try several slugs for boosters
  const slugsToTry = [];
  if (s === "GD04") {
    slugsToTry.push("special/8");
  } else if (s.startsWith("GD")) {
    const num = s.slice(2);
    slugsToTry.push(`bt${num}`);
    slugsToTry.push(`gd${num}`);
    slugsToTry.push(`gbt${num}`);
    slugsToTry.push(`bo${num}`);
  } else {
    slugsToTry.push(s.toLowerCase());
  }

  const results: Record<string, { price: string, url: string }> = {};

  for (const slug of slugsToTry) {
    const url = `${YYT_BASE_URL}/sell/${YYT_GAME_ID}/s/${slug}/`;
    try {
      console.log(`[Scraper] Syncing ${set} via ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(url, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) continue;
        console.warn(`[Scraper] Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const body = await response.text();
      const $ = cheerio.load(body);
      
      let foundOnPage = 0;
      
      // card_unit pattern
      $("div.card_unit").each((i, el) => {
        const text = $(el).text();
        const idMatch = text.match(/([GBS]{1,3}[DT0-9]+-[0-9]+)/);
        const priceMatch = text.match(/([0-9,]+)円/);
        
        if (idMatch && priceMatch) {
           let id = idMatch[1].toUpperCase();
           id = id.replace(/^GBT/, "GD").replace(/^GST/, "ST").replace(/^BT/, "GD");
           const price = priceMatch[1].replace(/[^\d]/g, "");
           results[id] = { price, url };
           foundOnPage++;
        }
      });

      // Fallback matching
      const allText = $.text();
      const idRegex = /([GBS]{1,3}[DT0-9]+-[0-9]+)/g;
      const priceRegex = /([0-9,]+)\s*円/; 
      let match;
      while ((match = idRegex.exec(allText)) !== null) {
        let id = match[1].toUpperCase();
        id = id.replace(/^GBT/, "GD").replace(/^GST/, "ST").replace(/^BT/, "GD");
        const searchBox = allText.substring(match.index, match.index + 300);
        const pMatch = priceRegex.exec(searchBox);
        if (pMatch) {
           const price = pMatch[1].replace(/[^\d]/g, "");
           if (!results[id]) {
             results[id] = { price, url };
             foundOnPage++;
           }
        }
      }
      
      if (foundOnPage > 0) {
        console.log(`[Scraper] Successfully found ${foundOnPage} cards using slug ${slug}`);
        // If we found cards with the primary slug or a good one, we can stop or keep going for completeness
        // For now, we'll keep going to catch reprints on other pages
      }
    } catch (error: any) {
      console.error(`[Scraper] Error with ${url}:`, error.message);
    }
  }

  if (Object.keys(results).length === 0) return null;
  console.log(`[Scraper] Total ${Object.keys(results).length} prices for ${set}`);
  return results;
}

let triggerSync: () => Promise<void>;

async function startBackgroundSync() {
  const ALL_SETS_TO_SYNC = ["GD01", "GD02", "GD03", "GD04", "ST01", "ST02", "ST03", "ST04", "ST05", "ST06", "ST07", "ST08", "ST09"];
  
  const sync = async () => {
    console.log("[Scraper] Starting background price sync...");
    let marketData: Record<string, { price: string, url: string }> = {};
    
    try {
      const existing = await fs.readFile(MARKET_FILE, "utf-8");
      marketData = JSON.parse(existing);
    } catch (e) {
      // First run or file missing
    }

    for (const set of ALL_SETS_TO_SYNC) {
      const setPrices = await fetchSetPrices(set);
      if (setPrices) {
        // Flat merge: use cardNumber as key
        Object.assign(marketData, setPrices);
        // Save incrementally
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(MARKET_FILE, JSON.stringify(marketData, null, 2));
      }
    }
    console.log("[Scraper] Sync complete.");
  };

  triggerSync = sync;

  // Initial sync
  sync();
  // Sync every 4 hours
  setInterval(sync, 1000 * 60 * 60 * 4);
}

import fsSync from "fs";

async function startServer() {
  const debugFile = path.join(process.cwd(), "debug.txt");
  fsSync.writeFileSync(debugFile, "[Server] Starting server...\n");
  
  const app = express();
  const PORT = 3000;

  // Start background sync
  startBackgroundSync();

  // Trust proxy for rate limiting (needed behind our infrastructure)
  app.set("trust proxy", 1);

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again after 15 minutes",
    keyGenerator: (req) => {
      // Use the first IP in the list from X-Forwarded-For, or fallback to remoteAddress
      return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || req.ip).split(',')[0].trim();
    }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 requests per `window` (Auth/Sensitive routes)
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many attempts on sensitive routes, please try again after 15 minutes",
    keyGenerator: (req) => {
      return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || req.ip).split(',')[0].trim();
    }
  });

  // Apply the global rate limiter to all requests
  app.use(globalLimiter);

  // Apply the stricter rate limiter to API routes (as they are the most sensitive)
  app.use("/api/", apiLimiter);

  // Serve public directory
  app.use(express.static('public'));
  
  // Use the API routes from api/index.ts
  app.use(apiApp);

  app.post("/api/clear-cache", async (req, res) => {
    try {
      await fs.unlink(MARKET_FILE);
      console.log("[Server] Cache cleared by user");
      // Don't wait for sync to complete, run it in background
      if (triggerSync) triggerSync();
      res.json({ success: true, message: "Cache cleared and sync started" });
    } catch (error) {
      // If file doesn't exist, still trigger sync
      if (triggerSync) triggerSync();
      res.json({ success: true, message: "Sync started" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    // Fallback for SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
