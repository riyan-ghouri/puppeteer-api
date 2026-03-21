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

// Test login/session
app.get("/test-login", async (req, res) => {
  const url = req.query.url || "https://goodwallet.xyz/en";

  let browser;
  try {
    // Launch Puppeteer on Render
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set User-Agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });

    // Go to site
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Inject saved session into localStorage
    if (SESSION && SESSION.localStorageData) {
      await page.evaluate((data) => {
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
      }, SESSION.localStorageData);

      // Reload to apply session
      await page.reload({ waitUntil: "networkidle2" });
    }

    // Optional: check login state
    const loggedIn = await page.evaluate(() => {
      // Example: GoodWallet shows user name in localStorage
      return !!localStorage.getItem("SIGNER_SESSION");
    });

    res.json({ success: true, loggedIn });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));