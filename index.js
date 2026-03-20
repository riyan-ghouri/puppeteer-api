const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.get("/screenshot", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.json({ success: false, error: "URL is required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });

    // take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    await browser.close();

    // send image
    res.setHeader("Content-Type", "image/png");
    res.send(screenshot);

  } catch (err) {
    if (browser) await browser.close();
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});