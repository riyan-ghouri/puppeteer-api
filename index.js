const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

const TARGET_URL = "https://www.instagram.com";
const DEBUG_PORT = 9222;   // Remote debugging port

app.get("/open", async (req, res) => {
  let browser;

  try {
    console.log("Launching browser with remote debugging...");

    browser = await puppeteer.launch({
      headless: true,                    // Must stay true on Render
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        `--remote-debugging-port=${DEBUG_PORT}`,
        "--remote-debugging-address=0.0.0.0",   // Allow external connection
        "--window-size=1280,800"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36");

    console.log(`Opening ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    await new Promise(r => setTimeout(r, 8000));

    const title = await page.title();

    res.json({
      success: true,
      message: "Browser is running with remote debugging",
      title: title,
      debugUrl: `http://your-app-name.onrender.com:${DEBUG_PORT}`,   // Change to your Render URL
      howToConnect: "Open Chrome on your laptop → go to chrome://inspect → Configure → Add your Render URL with port 9222"
    });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // Do NOT close browser immediately if you want to inspect it
    // browser.close() only when you want to end the session
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Remote debugging port: ${DEBUG_PORT}`);
});