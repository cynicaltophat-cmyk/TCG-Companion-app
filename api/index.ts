import express from "express";
import geminiRouter from "./gemini";

const app = express();

// Simple Mutex for Yuyu-tei requests to avoid 429 across all users
let isFetchingPrice = false;
const queue: (() => void)[] = [];

const acquireLock = () => {
  if (!isFetchingPrice) {
    isFetchingPrice = true;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    queue.push(resolve);
  });
};

const releaseLock = () => {
  if (queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  } else {
    isFetchingPrice = false;
  }
};

// Set body limit for base64 images
app.use(express.json({ limit: '20mb' }));
app.use(geminiRouter);

// API Route for Yuyu-tei prices
app.get("/api/yuyutei-price", async (req, res) => {
  return res.status(503).json({ error: "Price fetching is temporarily disabled to prevent rate limiting." });
});

export default app;
