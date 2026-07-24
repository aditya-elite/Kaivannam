/**
 * Stylesheet sanity checks.
 *
 *   node scripts/css-check.cjs              # static checks on source
 *   node scripts/css-check.cjs <css-url>    # also verify the BUILT css parses
 *
 * Why this exists: a single malformed rule silently disabled roughly half of
 * motion.css in production. Autoprefixer rewrites `@supports` conditions to add
 * vendor-prefixed variants, and when the condition contained a quoted data URI
 * it split the string at the first colon and emitted `url("data)` — an
 * unterminated string. CSS parsers abandon the remainder of a stylesheet at
 * that point, so every rule below it stopped existing. Nothing failed loudly:
 * the build passed, the classes were present in the source file, and the
 * elements still rendered, just without their geometry or motion.
 *
 * Grepping the source for a class name cannot catch this. The only reliable
 * check is whether the rule survives into the CSSOM, which is what the URL
 * mode below verifies.
 */
const fs = require("fs");
const path = require("path");

const FILES = ["src/app/globals.css", "src/app/motion.css"];
let failures = 0;

function fail(msg) {
  console.log(`  FAIL  ${msg}`);
  failures++;
}
function pass(msg) {
  console.log(`  ok    ${msg}`);
}

// ── 1. Brace balance ────────────────────────────────────────────────────────
for (const f of FILES) {
  const src = fs.readFileSync(path.resolve(f), "utf8");
  const clean = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");

  let depth = 0;
  for (const c of clean) {
    if (c === "{") depth++;
    else if (c === "}") depth--;
  }
  if (depth === 0) pass(`${f} — braces balanced`);
  else fail(`${f} — brace depth ends at ${depth}`);
}

// ── 2. No data URI inside an @supports condition ────────────────────────────
// This is the exact shape that got mangled. Keep it out of the source entirely.
for (const f of FILES) {
  const src = fs.readFileSync(path.resolve(f), "utf8");
  const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  const re = /@supports[^{]*\{/g;
  let m;
  while ((m = re.exec(withoutComments))) {
    if (/url\(\s*["']?\s*data:/i.test(m[0])) {
      bad.push(withoutComments.slice(0, m.index).split("\n").length);
    }
  }
  if (bad.length === 0) pass(`${f} — no data URI in an @supports condition`);
  else
    fail(
      `${f} — @supports condition contains a data URI at line(s) ${bad.join(", ")}. ` +
        `Autoprefixer will split it at the first colon and break the rest of the file. ` +
        `Test the property with a gradient instead, e.g. (mask-image: linear-gradient(#000,#000)).`,
    );
}

// ── 3. Built stylesheet actually parses end to end ──────────────────────────
const url = process.argv[2];
if (url) {
  (async () => {
    let chromium;
    try {
      ({ chromium } = require("playwright"));
    } catch {
      console.log("  skip  built-CSS check (playwright not installed)");
      done();
      return;
    }
    // Selectors spread across the whole of motion.css, in source order. If the
    // parser bails early the later ones simply will not exist.
    const PROBE = [
      ".row-shear", ".rule-hand", ".letterpress", ".selvedge-strip",
      ".kolam", ".seal-ring", ".weave-thread", ".press", ".charkha",
      ".showroom-light", ".shelf-plank", ".stand", ".blockprint",
    ];
    const browser = await chromium.launch();
    const page = await (await browser.newContext()).newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const found = await page.evaluate(() => {
      const sels = [];
      const walk = (rules) => {
        for (const r of rules) {
          if (r.selectorText) sels.push(r.selectorText);
          if (r.cssRules) walk(r.cssRules);
        }
      };
      for (const sh of document.styleSheets) {
        try { walk(sh.cssRules); } catch { /* cross-origin */ }
      }
      return sels.join(" | ");
    });
    await browser.close();

    const missing = PROBE.filter((s) => !found.includes(s));
    if (missing.length === 0) pass(`built CSS — all ${PROBE.length} probe selectors reachable`);
    else
      fail(
        `built CSS — ${missing.length} selector(s) missing from the CSSOM: ${missing.join(", ")}. ` +
          `A rule above the first missing one is aborting the parse.`,
      );
    done();
  })();
} else {
  done();
}

function done() {
  console.log(failures ? `\n${failures} check(s) failed` : "\nall stylesheet checks passed");
  process.exit(failures ? 1 : 0);
}
