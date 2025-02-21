const express = require("express");
const serverless = require("serverless-http");
const axios = require("axios");

const app = express();
const router = express.Router();

// Free API for exchange rates (Replace with a better one if needed)
const EXCHANGE_API = "https://api.exchangerate-api.com/v4/latest/";

// Cache to store exchange rates (to reduce API calls)
let exchangeRatesCache = {};
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Middleware to parse query params
app.use(express.json());

/**
 * 🔹 GET: Fetch exchange rates for a given base currency
 * Example: /latest?base=USD
 */
router.get("/latest", async (req, res) => {
  const base = req.query.base || "USD";

  try {
    // Check cache first
    if (exchangeRatesCache[base] && Date.now() - lastFetchTime < CACHE_DURATION) {
      return res.json({ base, rates: exchangeRatesCache[base], source: "cache" });
    }

    // Fetch real-time exchange rates
    const response = await axios.get(`${EXCHANGE_API}${base}`);
    exchangeRatesCache[base] = response.data.rates;
    lastFetchTime = Date.now();

    res.json({ base, rates: response.data.rates, source: "live" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exchange rates" });
  }
});

/**
 * 🔹 GET: Convert an amount from one currency to another
 * Example: /convert?from=USD&to=EUR&amount=100
 */
router.get("/convert", async (req, res) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Ensure exchange rates are available
    if (!exchangeRatesCache[from] || Date.now() - lastFetchTime > CACHE_DURATION) {
      const response = await axios.get(`${EXCHANGE_API}${from}`);
      exchangeRatesCache[from] = response.data.rates;
      lastFetchTime = Date.now();
    }

    const rate = exchangeRatesCache[from][to];
    if (!rate) {
      return res.status(400).json({ error: `Conversion rate from ${from} to ${to} not found` });
    }

    const convertedAmount = (amount * rate).toFixed(2);
    res.json({ from, to, originalAmount: amount, convertedAmount, rate });
  } catch (error) {
    res.status(500).json({ error: "Conversion failed" });
  }
});

// Apply routes
app.use("/.netlify/functions/currency", router);

module.exports.handler = serverless(app);
