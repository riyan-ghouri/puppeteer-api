const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

const SESSION = {
  localStorageData: {
    "SIGNER_SESSION": "{\"type\":\"PRIVATE_KEY\",\"sessionOrigin\":\"localStorage\",\"authProvider\":\"google\",\"userName\":\"welldress Tailor\",\"profileImage\":\"https://lh3.googleusercontent.com/a/ACg8ocKDlBXTv5PP5msem10XznyPLM0cd4vFWqMFtjzlpRe-tLhrdA=s96-c\",\"signer\":{\"EVM\":{\"provider\":null,\"address\":\"0x9942A8514B1Fd2b7C1632F2A5C9a461209401Cbe\"},\"BTC\":{\"address\":\"bc1qr5vpn5je5l89pdryk7dchc8yv8s34l7g2vgwu4\",\"publicKey\":\"03153b21963db457cc6c28776f6d3bb0dde161d0a10b9d6b3e0d78818ffe086fb7\"},\"DOGE\":{\"address\":\"DLnuBV7Mw4oNqk3nqvCp6MvsHuhY1hrJwK\",\"publicKey\":\"035193381db6bb5cb0fe5128718c659678fa0840287b0f90990caf6a6403beea1e\"},\"SOLANA\":{\"address\":\"ERaM1hnbx1spni1qYfmv7mWtZwrvxAEtWki2uqRPZMCr\",\"keyPair\":{\"privateKey\":{},\"publicKey\":{}}},\"XRP\":{\"address\":\"rfJHzKpEr24iRiYAPL8LWkVpQQpNj72o8o\",\"publicKey\":\"ED40145AC829CB4718A839B9EE1325B6DA4DB061A9F90B4A79C42552293377C78C\"}}}"
    // ← paste your full escaped JSON string here
  }
};

app.get("/test-login", async (req, res) => {
  const url = "https://goodwallet.xyz/en"; // force your target

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
        "--disable-web-security",           // sometimes helps with cross-origin issues
        "--ignore-certificate-errors",
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Aggressive stealth (do this BEFORE any navigation)
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // Spoof plugins & languages
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

    // Very early injection — before any script runs
    await page.goto("about:blank");

    if (SESSION.localStorageData) {
      console.log("Injecting SIGNER_SESSION early");
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error("localStorage set error:", e);
          }
        }
      }, SESSION.localStorageData);
    }

    console.log("Navigating to target");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Give Torus/Web3Auth time to initialize & try to reconstruct
    await page.waitForTimeout(10000); // crucial — MPC fetch takes time

    // Better login check — try to see if signer / wallet is actually usable
    const authState = await page.evaluate(() => {
      const signerSession = localStorage.getItem("SIGNER_SESSION");
      const isLoggedIn = 
        !!signerSession &&
        window?.gooddollar?.wallet?.isConnected?.() ||    // if they expose something
        document.querySelector('[data-testid="wallet-address"]') !== null || // heuristic
        !!localStorage.getItem("web3auth_session");       // sometimes they use web3auth keys too

      return {
        hasSignerSession: !!signerSession,
        isLoggedInGuess: isLoggedIn,
        visibleWalletAddress: document.querySelector('[data-testid="wallet-address"]')?.textContent || null,
        consoleErrors: window.consoleErrors || [] // if you collect them
      };
    });

    console.log("Auth state:", authState);

    // Screenshot for debug (very helpful on Render)
    await page.screenshot({ path: "/tmp/debug.png", fullPage: true });
    console.log("Screenshot saved to /tmp/debug.png");

    res.json({
      success: true,
      authState,
      // base64 screenshot if you want to return it
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));