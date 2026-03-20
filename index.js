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

    // 🧠 STEP 1: type reference number
    await page.type('input[name="refno"]', ref);

    // 🧠 STEP 2: click submit button
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    ]);

    // 🧠 STEP 3: extract bill data
    const data = await page.evaluate(() => {
      const getText = (selector) =>
        document.querySelector(selector)?.innerText || null;

      return {
        name: getText("#customerName"),
        amount: getText("#billAmount"),
        dueDate: getText("#dueDate"),
      };
    });

    await browser.close();

    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});