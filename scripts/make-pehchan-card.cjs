  /**
 * Generates a demo "मेरा भारत — मेरी पहचान" ID card PNG for a seeded artisan,
 * rendered with the bundled Chromium. Bilingual labels (Hindi + English) so the
 * eng OCR can still read Name / ID / Craft / Region off it.
 *
 *   node scripts/make-pehchan-card.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(process.cwd(), "public", "samples", "pehchan-lakshmi.png");
const PHOTO = path.join(process.cwd(), "public", "samples", "artisan-lakshmi.png");

const person = {
  name: "Lakshmi Devi",
  id: "234176589010",
  craft: "Kanchipuram Silk Weaving",
  region: "Kanchipuram, Tamil Nadu",
};

const photoDataUri = fs.existsSync(PHOTO)
  ? "data:image/png;base64," + fs.readFileSync(PHOTO).toString("base64")
  : "";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; box-sizing:border-box; font-family:"Nirmala UI","Segoe UI",Arial,sans-serif; }
  #card { width:1000px; height:560px; position:relative; overflow:hidden;
    background:linear-gradient(180deg,#ff9933 0%,#ff9933 20%,#ffffff 34%,#ffffff 66%,#138808 80%,#138808 100%); }
  #veil { position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.55) 45%,rgba(255,255,255,.55) 55%,rgba(255,255,255,.15)); }
  .row { position:relative; }
  #title { text-align:center; padding-top:20px; }
  #title h1 { font-size:46px; font-weight:800; color:#2b2b2b; letter-spacing:.5px; }
  #title .fist { font-size:34px; vertical-align:middle; margin:0 14px; }
  #idcard { display:inline-block; margin-top:10px; background:#1f2a44; color:#fff; font-weight:800;
    font-size:26px; padding:6px 26px; border-radius:8px; letter-spacing:1px; }
  #body { position:relative; display:flex; padding:34px 44px 0; gap:28px; }
  #left { flex:1; }
  .field { margin-bottom:26px; }
  .field .lab { font-size:26px; font-weight:800; color:#111; }
  .field .val { display:inline-block; min-width:360px; font-size:30px; font-weight:700; color:#0b2f6b;
    border-bottom:3px solid #333; padding:0 6px 2px; margin-left:8px; }
  #photo { width:220px; height:270px; border:4px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,.25);
    background:#eee center/cover no-repeat; border-radius:4px; }
  #tagline { position:absolute; left:44px; bottom:26px; font-size:28px; font-weight:800; color:#1a1a1a; }
  #approved { position:absolute; right:44px; bottom:22px; text-align:center; color:#333; }
  #approved .a { font-size:18px; font-weight:600; }
  #approved .b { font-size:26px; font-weight:800; color:#c0392b; font-style:italic; }
</style></head><body>
  <div id="card">
    <div id="veil"></div>
    <div class="row" id="title">
      <h1><span class="fist">✊</span>मेरा भारत — मेरी पहचान<span class="fist">✊</span></h1>
      <div id="idcard">ID कार्ड</div>
    </div>
    <div id="body">
      <div id="left">
        <div class="field"><span class="lab">नाम / Name:</span><span class="val">${person.name}</span></div>
        <div class="field"><span class="lab">ID नं. / ID No.:</span><span class="val">${person.id}</span></div>
        <div class="field"><span class="lab">शिल्प / Craft:</span><span class="val">${person.craft}</span></div>
        <div class="field"><span class="lab">क्षेत्र / Region:</span><span class="val">${person.region}</span></div>
      </div>
      <div id="photo" style="background-image:url('${photoDataUri}')"></div>
    </div>
    <div id="tagline">जहाँ तिरंगा, वहीं मेरा अभिमान।</div>
    <div id="approved"><div class="a">Approved by</div><div class="b">Kaivannam</div></div>
  </div>
</body></html>`;

(async () => {
  // Use the cached full-Chromium build (the freshly-reinstalled playwright asks
  // for a newer headless-shell that isn't downloaded here).
  const cached = "C:/Users/91807/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
  const browser = await chromium.launch(fs.existsSync(cached) ? { executablePath: cached } : {});
  const page = await browser.newPage({ viewport: { width: 1000, height: 560 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  const el = await page.$("#card");
  await el.screenshot({ path: OUT });
  await browser.close();
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
