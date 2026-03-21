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

app.get("/test-login", async (req, res) => {
  const url = req.query.url || "https://goodwallet.xyz/en";

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Log browser console messages (very useful)
    page.on("console", (msg) => {
      console.log("BROWSER LOG:", msg.text());
    });

    page.on("pageerror", (err) => {
      console.error("BROWSER PAGE ERROR:", err);
    });

    page.on("requestfailed", (req) => {
      console.warn("REQUEST FAILED:", req.url(), req.failure().errorText);
    });

    // Set User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    console.log("➡️ Going to URL:", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Inject saved session
    if (SESSION && SESSION.localStorageData) {
      console.log("➡️ Injecting session into localStorage");
      await page.evaluate((data) => {
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
      }, SESSION.localStorageData);

      // Reload page to apply session
      await page.reload({ waitUntil: "networkidle2" });
    }

    // Check all localStorage keys
    const localStorageContents = await page.evaluate(() => {
      let items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    console.log("🗂 LocalStorage Contents:", localStorageContents);

    // Optional: check login state
    const loggedIn = await page.evaluate(() => !!localStorage.getItem("SIGNER_SESSION"));

    console.log("✅ Logged in?", loggedIn);
    res.json({ success: true, loggedIn, localStorageContents });

  } catch (err) {
    console.error("❌ ERROR IN /test-login:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));