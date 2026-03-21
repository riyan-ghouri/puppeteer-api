const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Load saved session
let SESSION = null;
const SESSION_FILE = "session.json";
if (fs.existsSync(SESSION_FILE)) {
  SESSION = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
}

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.get("/screenshot", async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith("http")) {
    return res.status(400).json({
      success: false,
      error: "Valid URL is required (include http/https)",
    });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // User-Agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });

    // Optional: block heavy resources
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media"].includes(type)) req.abort();
      else req.continue();
    });

    // Go to page first
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Inject session into localStorage (if exists)
    if (SESSION && SESSION.localStorageData) {
      await page.evaluate((data) => {
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
      }, SESSION.localStorageData);

      // reload page to apply session
      await page.reload({ waitUntil: "networkidle2" });
    }

    // Take screenshot
    const screenshot = await page.screenshot({ type: "png", fullPage: true });

    res.setHeader("Content-Type", "image/png");
    res.send(screenshot);

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));