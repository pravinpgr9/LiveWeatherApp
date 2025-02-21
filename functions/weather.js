const express = require("express");
const serverless = require("serverless-http");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const router = express.Router();

const API_KEY = "84361f908a2b0d3d95e11ad32c962ce1";
const DB_URL = "postgresql://neondb_owner:npg_9EnGfuvVjlg4@ep-broad-hall-a1vyy74g-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ connectionString: DB_URL });

router.get("/", async (req, res) => {
  try {
    const lat = req.query.lat || "19.0760";
    const lon = req.query.lon || "72.8777";

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    const [weatherRes, airRes] = await Promise.all([
      axios.get(weatherUrl),
      axios.get(airQualityUrl),
    ]);

    const weatherData = weatherRes.data;
    const airData = airRes.data;

    if (!airData.list || airData.list.length === 0) {
      throw new Error("Air quality data unavailable");
    }

    const temperature = weatherData.main.temp;
    const weatherCondition = weatherData.weather[0].description;
    const aqi = airData.list[0].main.aqi;
    const created_at = new Date().toISOString();

    await pool.query(
      `INSERT INTO whetherappdata (lat, long, temperature, condition, aqi, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [lat, lon, temperature, weatherCondition, aqi, created_at]
    );

    res.json({
      app_name: "Real-Time Weather & Air Quality API",
      version: "1.0",
      developer: "Pravin Madhukar Pagare",
      location: { lat, lon },
      temperature: `${temperature}°C`,
      condition: weatherCondition,
      air_quality: `AQI ${aqi}`,
      message: "Data inserted successfully"
    });
  } 
  catch (error) {
  console.error("Error Details:", {
    message: error.message,
    response: error.response?.data,
    stack: error.stack,
  });
  res.status(500).json({ error: "Failed to fetch or insert weather data", details: error.message });
}
});

app.use("/.netlify/functions/weather", router);

module.exports.handler = serverless(app);
