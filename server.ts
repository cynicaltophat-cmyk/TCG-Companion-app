import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for Yuyu-tei prices
  app.get("/api/yuyutei-price", async (req, res) => {
    const { cardNumber, artType } = req.query;
    
    if (!cardNumber) {
      return res.status(400).json({ error: "cardNumber is required" });
    }

    try {
      console.log(`[Price Fetch] Searching for ${cardNumber} (${artType})`);
      const searchUrl = `https://yuyu-tei.jp/sell/gcg/s/search?search_word=${encodeURIComponent(cardNumber as string)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://yuyu-tei.jp/'
        }
      });
      
      if (!response.ok) {
        console.error(`[Price Fetch] Yuyu-tei error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: `Failed to fetch from Yuyu-tei: ${response.statusText}` });
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Check if we are on a single card page (redirected)
      // Single card pages often have a specific breadcrumb or structure
      const isSinglePage = $(".card-detail, .card_detail, #card_detail, .product-detail, .item_detail").length > 0;
      
      if (isSinglePage) {
        console.log(`[Price Fetch] Detected single page for ${cardNumber}`);
        const title = $("h1, .card-name, .title, .product-name").first().text().trim();
        const priceText = $(".price, strong, [class*='price'], .sell_price").first().text().trim();
        const priceMatch = priceText.match(/([\d,]+)\s?円/);
        if (priceMatch) {
          return res.json({ price: `¥${priceMatch[1].replace(/\s/g, '')}` });
        }
      }

      // Yuyu-tei GCG structure:
      // Cards are in .card-product or similar
      const cardUnits = $(".card-product, .card-unit, .item, [class*='card_unit'], [class*='item_list'] li, .card_unit, .product-item");
      console.log(`[Price Fetch] Found ${cardUnits.length} potential card units`);
      
      let foundPrice: string | null = null;
      const debugInfo: any[] = [];
      const candidates: { title: string, price: string, isParallel: boolean, isBeta: boolean }[] = [];

      cardUnits.each((_, el) => {
        const title = $(el).find("h4, .name, .title, [class*='name'], .card-name, .product-name").text().trim();
        let priceText = $(el).find("strong, .price, [class*='price'], .card-price, .sell_price").text().trim();
        
        const unitText = $(el).text();
        // Be more lenient with card number matching (ignore case and hyphens)
        const normalizedUnitText = unitText.replace(/[-\s]/g, '').toLowerCase();
        const normalizedCardNumber = (cardNumber as string).replace(/[-\s]/g, '').toLowerCase();
        
        if (!normalizedUnitText.includes(normalizedCardNumber)) return;

        if (!priceText) {
          $(el).find("*").each((_, subEl) => {
            const text = $(subEl).text().trim();
            if ((text.includes("円") || text.includes("¥")) && text.match(/\d/)) {
              priceText = text;
              return false;
            }
          });
        }

        if (title && priceText) {
          const isParallel = title.includes("パラレル") || title.includes("(P)") || title.includes("Parallel") || title.includes("P-");
          const isBeta = title.includes("ベータ") || title.includes("(B)") || title.includes("Beta") || title.includes("β");
          
          let extractedPrice = "";
          let priceMatch = priceText.match(/([\d,]+)\s?円/);
          if (!priceMatch) priceMatch = priceText.match(/¥\s?([\d,]+)/);
          if (!priceMatch) {
            const numbersOnly = priceText.match(/[\d,]+/);
            if (numbersOnly) priceMatch = [null, numbersOnly[0]] as any;
          }
          
          if (priceMatch && priceMatch[1]) {
            extractedPrice = `¥${priceMatch[1].replace(/\s/g, '')}`;
            candidates.push({ title, price: extractedPrice, isParallel, isBeta });
            debugInfo.push({ title, priceText, extractedPrice });
          }
        }
      });

      console.log(`[Price Fetch] Found ${candidates.length} matching candidates`);

      // Try to find the best match among candidates
      if (candidates.length > 0) {
        let bestMatch: typeof candidates[0] | null = null;
        
        for (const cand of candidates) {
          const isParallel = cand.isParallel;
          const isBeta = cand.isBeta;
          const isPremium = cand.title.includes("プレミアム") || cand.title.includes("Premium");
          const isChampionship = cand.title.includes("チャンピオンシップ") || cand.title.includes("上位賞") || cand.title.includes("Championship");

          let matches = false;
          if (artType === "Parallel") {
            matches = isParallel && !isChampionship && !isBeta;
          } else if (artType === "Beta") {
            matches = isBeta && !isParallel;
          } else if (artType === "Beta Parallel") {
            matches = (isBeta && isParallel) || cand.title.includes("ベータ パラレル");
          } else if (artType === "Premium") {
            matches = isPremium;
          } else if (artType === "Championship") {
            matches = isChampionship;
          } else {
            // Base art
            matches = !isParallel && !isBeta && !isPremium && !isChampionship;
          }

          if (matches) {
            bestMatch = cand;
            break;
          }
        }

        // If no perfect match found but we have candidates, and it's Base art, just take the first one
        if (!bestMatch && artType === "Base art") {
          console.log(`[Price Fetch] No perfect Base art match, taking first candidate`);
          bestMatch = candidates[0];
        }
        
        if (bestMatch) {
          console.log(`[Price Fetch] Returning price: ${bestMatch.price}`);
          return res.json({ price: bestMatch.price });
        }
      }

      // If no card units found, maybe the structure is different
      if (debugInfo.length === 0) {
        console.log(`[Price Fetch] No units found, attempting broad search`);
        // Try a very broad search for anything that looks like a price near a title
        $("a, div, span, p, li").each((_, el) => {
          const text = $(el).text().trim();
          if (text.includes(cardNumber as string)) {
            // Found something with the card number, look for price nearby
            const parent = $(el).parent();
            const priceNear = parent.find(".price, [class*='price'], :contains('円'), .sell_price").first().text().trim();
            if (priceNear) {
              const priceMatch = priceNear.match(/([\d,]+)円/);
              if (priceMatch) {
                foundPrice = `¥${priceMatch[1]}`;
                return false;
              }
              const priceMatchAlt = priceNear.match(/¥\s?([\d,]+)/);
              if (priceMatchAlt) {
                foundPrice = `¥${priceMatchAlt[1]}`;
                return false;
              }
            }
          }
        });
      }

      if (foundPrice) {
        console.log(`[Price Fetch] Broad search found price: ${foundPrice}`);
        res.json({ price: foundPrice });
      } else {
        console.warn(`[Price Fetch] Price not found for ${cardNumber}`);
        res.status(404).json({ 
          error: "Price not found on Yuyu-tei", 
          cardNumber, 
          artType,
          foundItems: debugInfo.length,
          debug: debugInfo.slice(0, 10)
        });
      }
    } catch (error: any) {
      console.error("Error fetching Yuyu-tei price:", error);
      res.status(500).json({ error: "Internal server error", message: error.message });
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
