require('dotenv').config();   // ← Add this at the very top

const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

const TARGET_URL = "https://www.instagram.com";

// Get session from environment variables
const SESSIONID = process.env.SESSIONID;
const DS_USER_ID = process.env.DS_USER_ID;
const CSRFTOKEN = process.env.CSRFTOKEN;

if (!SESSIONID || !DS_USER_ID || !CSRFTOKEN) {
  console.warn("⚠️  Warning: Some Instagram session variables are missing!");
}

const COOKIES = [
  {
    name: "sessionid",
    value: SESSIONID,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  },
  {
    name: "csrftoken",
    value: CSRFTOKEN,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  },
  {
    name: "ds_user_id",
    value: DS_USER_ID,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  }
];

app.get("/", async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    );

    console.log("Setting Instagram session cookies...");
    await page.setCookie(...COOKIES);

    console.log("Opening Instagram with session...");
    await page.goto(TARGET_URL, { 
      waitUntil: "domcontentloaded", 
      timeout: 60000 
    });

    await new Promise(r => setTimeout(r, 8000));

    const title = await page.title();

    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('svg[aria-label="Home"]') || 
             document.body.innerText.includes("Profile");
    });

    res.json({
      success: true,
      message: isLoggedIn ? "✅ Logged in successfully using session" : "Opened Instagram (login status uncertain)",
      title: title,
      loggedIn: isLoggedIn
    });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});