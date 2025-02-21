const express = require("express");
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Hello from Netlify Lambda!" });
});

// Apply router under the correct path
app.use("/.netlify/functions/express", router);

// Export for Netlify
module.exports.handler = serverless(app);
