const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

const TARGET_URL = "https://www.instagram.com";

app.get("/open", async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--remote-debugging-port=9222",
        "--remote-debugging-address=0.0.0.0"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    );

    console.log("Opening Instagram...");
    
    await page.goto(TARGET_URL, { 
      waitUntil: "domcontentloaded", 
      timeout: 60000 
    });

    await new Promise(r => setTimeout(r, 7000)); // Wait for page to load

    const title = await page.title();

    console.log(`Instagram opened successfully | Title: ${title}`);

    res.json({
      success: true,
      message: "Instagram opened successfully",
      title: title,
      note: "Browser is running on Render server"
    });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
  // Note: Browser is NOT closed here so you can inspect it if needed
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Target: ${TARGET_URL}`);
});