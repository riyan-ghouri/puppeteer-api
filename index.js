const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { setTimeout: sleep } = require('node:timers/promises');

const app = express();
const PORT = process.env.PORT || 3000;

const SESSION = {
  localStorageData: {
    "SIGNER_SESSION": "{\"type\":\"PRIVATE_KEY\",\"sessionOrigin\":\"localStorage\",\"authProvider\":\"google\",\"userName\":\"welldress Tailor\",\"profileImage\":\"https://lh3.googleusercontent.com/a/ACg8ocKDlBXTv5PP5msem10XznyPLM0cd4vFWqMFtjzlpRe-tLhrdA=s96-c\",\"signer\":{\"EVM\":{\"provider\":null,\"address\":\"0x9942A8514B1Fd2b7C1632F2A5C9a461209401Cbe\"},\"BTC\":{\"address\":\"bc1qr5vpn5je5l89pdryk7dchc8yv8s34l7g2vgwu4\",\"publicKey\":\"03153b21963db457cc6c28776f6d3bb0dde161d0a10b9d6b3e0d78818ffe086fb7\"},\"DOGE\":{\"address\":\"DLnuBV7Mw4oNqk3nqvCp6MvsHuhY1hrJwK\",\"publicKey\":\"035193381db6bb5cb0fe5128718c659678fa0840287b0f90990caf6a6403beea1e\"},\"SOLANA\":{\"address\":\"ERaM1hnbx1spni1qYfmv7mWtZwrvxAEtWki2uqRPZMCr\",\"keyPair\":{\"privateKey\":{},\"publicKey\":{}}},\"XRP\":{\"address\":\"rfJHzKpEr24iRiYAPL8LWkVpQQpNj72o8o\",\"publicKey\":\"ED40145AC829CB4718A839B9EE1325B6DA4DB061A9F90B4A79C42552293377C78C\"}}}"
    // ← paste your full escaped JSON string here
  }
};

app.get("/test-login", async (req, res) => {
  const url = "https://goodwallet.xyz/en";

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--window-size=1280,800",
        "--disable-web-security",
        "--ignore-certificate-errors",
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      timeout: 90000, // give launch more breathing room on cold starts
    });

    const page = await browser.newPage();

    // Stealth injections early
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Inject session on blank page
    await page.goto("about:blank");

    if (SESSION.localStorageData) {
      console.log("Injecting SIGNER_SESSION early");
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error("localStorage set error for key", key, ":", e);
          }
        }
      }, SESSION.localStorageData);
    }

    console.log("Navigating to target");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Wait for potential MPC/network activity (replaced waitForTimeout)
    console.log("Waiting 10 seconds for Torus/Web3Auth init...");
    await sleep(10000);

    // More realistic auth check
    const authState = await page.evaluate(() => {
      const signerSession = localStorage.getItem("SIGNER_SESSION");
      const web3authSession = localStorage.getItem("web3auth_session"); // sometimes present

      // Heuristics for logged-in state (adjust based on what you see in devtools)
      const maybeLoggedIn =
        !!signerSession ||
        !!web3authSession ||
        !!document.querySelector('[data-testid="wallet-address"], .wallet-address, [class*="address"]') ||
        window?.gooddollar?.wallet?.isConnected?.() ||
        localStorage.getItem("user")?.includes("address");

      return {
        hasSignerSession: !!signerSession,
        hasWeb3AuthSession: !!web3authSession,
        isProbablyLoggedIn: maybeLoggedIn,
        visibleWalletText: document.querySelector('[data-testid="wallet-address"], .wallet-address')?.textContent?.trim() || null,
        localStorageKeys: Object.keys(localStorage).slice(0, 20), // limit output
      };
    });

    console.log("Auth state:", authState);

    // Debug screenshot (Render /tmp is writable)
    const screenshotPath = "/tmp/debug-" + Date.now() + ".png";
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved:", screenshotPath);

    res.json({
      success: true,
      authState,
      note: "Check Render logs for console output & screenshot path (download via shell if needed)"
    });

  } catch (err) {
    console.error("ERROR in /test-login:", err.stack || err);
    res.status(500).json({ success: false, error: err.message, stack: err.stack?.slice(0, 500) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));