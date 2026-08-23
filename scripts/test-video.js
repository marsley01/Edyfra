const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1400,900", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleMsgs = [];
  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning") consoleMsgs.push(`[${t}] ${msg.text().slice(0, 220)}`);
  });
  page.on("pageerror", (err) => consoleMsgs.push(`[pageerror] ${String(err).slice(0, 300)}`));
  page.on("requestfailed", (req) => {
    const failure = (req.failure() && req.failure().errorText) || "";
    if (/blocked|CSP/i.test(failure)) {
      consoleMsgs.push(`[BLOCKED] ${req.url().slice(0, 140)} - ${failure}`);
    }
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 5000));

  // Find the video result cards (rendered after the auto-search)
  const cards = await page.$$("section button img[src*='ytimg'], section button img[src*='googleusercontent']");
  console.log("video cards found:", cards.length);

  if (cards.length === 0) {
    // fallback: any button containing an <img> inside the results section
    const anyImgs = await page.$$eval("img", (els) =>
      els.filter((e) => /ytimg|googleusercontent/.test(e.src)).length
    );
    console.log("yt thumbnails on page:", anyImgs);
    console.log("CONSOLE:", consoleMsgs.slice(0, 8).join("\n"));
    await browser.close();
    return;
  }

  await cards[0].click();
  console.log("clicked first video card");
  await new Promise((r) => setTimeout(r, 9000));

  const diag = await page.evaluate(() => {
    const modal = document.querySelector("[role='dialog']");
    const iframe = modal ? modal.querySelector("iframe") : null;
    return {
      modalExists: Boolean(modal),
      iframeExists: Boolean(iframe),
      iframeSrc: iframe ? iframe.src.slice(0, 120) : null,
      iframeSize: iframe ? `${iframe.clientWidth}x${iframe.clientHeight}` : null,
      playerDivs: modal ? modal.querySelectorAll("#ytplayer, [id^='youtube-'], [id^='ytplayer']").length : 0,
      modalHTMLStart: modal ? modal.innerHTML.replace(/\s+/g, " ").slice(0, 300) : null,
    };
  });
  console.log("DIAG:", JSON.stringify(diag, null, 2));
  console.log("CONSOLE MSGS:", consoleMsgs.slice(0, 12).join("\n") || "(none)");

  await page.screenshot({ path: "scratch/video-modal-test.png" });
  await browser.close();
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
