import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import apiApp from "./api/index.ts";
import { rateLimit } from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // IMPORTANT: Trust the proxy provided by the AI Studio environment
  // This allows express-rate-limit to correctly identify user IPs
  app.set('trust proxy', 1);

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 2000, // Increased to accommodate high-volume prefetching
    standardHeaders: true, 
    legacyHeaders: false, 
    message: "Too many requests from this IP, please try again after 15 minutes",
    // Use the standardized key generator
    keyGenerator: (req) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (Array.isArray(forwarded)) return forwarded[0];
      return forwarded || req.ip || 'unknown';
    }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Increased to 1000 to allow smooth prefetching of card prices
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many attempts on API routes, please try again after 15 minutes",
    keyGenerator: (req) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (Array.isArray(forwarded)) return forwarded[0];
      return forwarded || req.ip || 'unknown';
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
