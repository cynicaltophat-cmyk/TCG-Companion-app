import express from "express";
import * as cheerio from "cheerio";

const app = express();

// API Route for Yuyu-tei prices
app.get("/api/yuyutei-price", async (req, res) => {
  // DISABLING PRICE FETCHING TEMPORARILY DUE TO YUYU-TEI 403 ERRORS
  return res.status(503).json({ error: "Price fetching is temporarily disabled due to scheduled maintenance on external provider." });

  const { cardNumber, artType } = req.query;
  
  if (!cardNumber) {
    return res.status(400).json({ error: "cardNumber is required" });
  }

  try {
    console.log(`[Price Fetch] Searching for ${cardNumber} (${artType})`);
    const searchUrl = `https://yuyu-tei.jp/sell/gcg/s/search?search_word=${encodeURIComponent(cardNumber as string)}`;
    
    // Enhanced headers to look more like a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://yuyu-tei.jp/',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive'
    };

    let response = await fetch(searchUrl, { headers });
    
    // If 403, try a different approach - maybe fetching the home page first to get cookies
    if (response.status === 403) {
      console.warn(`[Price Fetch] 403 Forbidden on first attempt, trying with home page session...`);
      // Small delay to seem more human
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const homeResponse = await fetch('https://yuyu-tei.jp/', { headers });
      const cookies = homeResponse.headers.get('set-cookie');
      
      if (cookies) {
        console.log(`[Price Fetch] Got cookies, retrying search...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        response = await fetch(searchUrl, { 
          headers: { 
            ...headers, 
            'Cookie': cookies.split(';')[0] 
          } 
        });
      } else {
        // Try a different search URL structure as a last resort
        console.log(`[Price Fetch] No cookies found, trying alternative search URL...`);
        const altSearchUrl = `https://yuyu-tei.jp/sell/gcg/s/search?search_word=${encodeURIComponent(cardNumber as string)}&sort=price_asc`;
        response = await fetch(altSearchUrl, { headers });
      }
    }
    
    if (!response.ok) {
      console.error(`[Price Fetch] Yuyu-tei error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: `Failed to fetch from Yuyu-tei: ${response.statusText}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
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

    const cardUnits = $(".card-product, .card-unit, .item, [class*='card_unit'], [class*='item_list'] li, .card_unit, .product-item");
    console.log(`[Price Fetch] Found ${cardUnits.length} potential card units`);
    
    let foundPrice: string | null = null;
    const debugInfo: any[] = [];
    const candidates: { title: string, price: string, isParallel: boolean, isBeta: boolean }[] = [];

    cardUnits.each((_, el) => {
      const title = $(el).find("h4, .name, .title, [class*='name'], .card-name, .product-name").text().trim();
      let priceText = $(el).find("strong, .price, [class*='price'], .card-price, .sell_price").text().trim();
      
      const unitText = $(el).text();
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
          matches = !isParallel && !isBeta && !isPremium && !isChampionship;
        }

        if (matches) {
          bestMatch = cand;
          break;
        }
      }

      if (!bestMatch && artType === "Base art") {
        console.log(`[Price Fetch] No perfect Base art match, taking first candidate`);
        bestMatch = candidates[0];
      }
      
      if (bestMatch) {
        console.log(`[Price Fetch] Returning price: ${bestMatch.price}`);
        return res.json({ price: bestMatch.price });
      }
    }

    if (debugInfo.length === 0) {
      console.log(`[Price Fetch] No units found, attempting broad search`);
      $("a, div, span, p, li").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(cardNumber as string)) {
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

export default app;
