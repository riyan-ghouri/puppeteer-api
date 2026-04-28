const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

const TARGET_URL = "https://www.instagram.com";

// ←←← PASTE YOUR SESSIONID HERE
const SESSIONID = "48765906293%3AOOo51FF6Q1VPfP%3A22%3AAYjDA1WOtKk9rWp1e4JVOddI3Dciltimrp7_R8R9bg";   // ← Change this
const dS_user_id = "48765906293";   // ← Change this
const CRFTOKEN = "lOqVZfKBoEExZDZtNLgMJ23RasjfCC8J";   // ← Change this

// Optional: Add more cookies if needed
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
    value: CRFTOKEN,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  },
  {
    name: "ds_user_id",
    value: dS_user_id,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  }
  // You can add ds_user_id, csrftoken, etc. here
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

    // Set the session cookies before navigating
    console.log("Setting Instagram session cookies...");
    await page.setCookie(...COOKIES);

    console.log("Opening Instagram with your session...");
    await page.goto(TARGET_URL, { 
      waitUntil: "domcontentloaded", 
      timeout: 60000 
    });

    // Wait a bit for the page to recognize the session
    await new Promise(r => setTimeout(r, 8000));

    const title = await page.title();
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('svg[aria-label="Home"]') || 
             document.body.innerText.includes("Profile");
    });

    res.json({
      success: true,
      message: isLoggedIn ? "Logged in successfully using session" : "Opened Instagram (login status uncertain)",
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