import express from "express";
import fs from "fs/promises";
import path from "path";

const app = express();
const MARKET_FILE = path.join(process.cwd(), "data", "market.json");

app.get("/api/prices", async (req, res) => {
  try {
    const data = await fs.readFile(MARKET_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.warn("Market data not ready yet.");
    res.json({});
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
