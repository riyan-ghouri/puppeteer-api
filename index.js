const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.get("/bill", async (req, res) => {
  const ref = req.query.ref;

  if (!ref) {
    return res.json({ success: false, error: "Reference number required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // 🧠 make it look like real browser
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    // 🔥 LOAD PAGE (more stable)
    await page.goto("https://bill.pitc.com.pk/mepcobill", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // ⏳ wait for input
    await page.waitForSelector('input[name="refno"]', { timeout: 30000 });

    // ✍️ type ref
    await page.type('input[name="refno"]', ref, { delay: 50 });

    // 🔥 click WITHOUT relying on navigation
    await page.click('input[type="submit"]');

    // ⏳ manual wait (more reliable for this site)
    await page.waitForTimeout(5000);

    // 🧪 DEBUG + DATA
    const data = await page.evaluate(() => {
      const text = document.body.innerText;

      return {
        title: document.title,
        preview: text.slice(0, 800),
      };
    });

    await browser.close();

    res.json({ success: true, data });
  } catch (err) {
    if (browser) await browser.close();
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});