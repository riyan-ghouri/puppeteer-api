const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express(); // ✅ THIS was missing
const PORT = process.env.PORT || 3000;

// 🔥 Root route (test)
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// 🧾 Bill route
app.get("/bill", async (req, res) => {
  const ref = req.query.ref;

  if (!ref) {
    return res.json({ success: false, error: "Reference number required" });
  }

  try {
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto("https://bill.pitc.com.pk/mepcobill", {
      waitUntil: "domcontentloaded",
    });

    await page.type('input[name="refno"]', ref);

    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    ]);

    const data = await page.evaluate(() => {
      return {
        title: document.title,
        body: document.body.innerText.slice(0, 500) // debug
      };
    });

    await browser.close();

    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});