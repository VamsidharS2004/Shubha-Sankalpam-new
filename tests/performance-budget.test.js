/* Performance guard-rails: these fail if a future change would make the site slower
   (heavy images, render-blocking third-party files, un-prerendered header, leftover
   unused assets, oversized CSS/JS). Run with: npm test */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const FRONTEND = path.resolve(__dirname, "../frontend");
const ASSETS = path.join(FRONTEND, "assets");
const SKIP_PAGES = new Set(["404.html", "google09a10f499bc60551.html", "admin.html", "booking_backup.html", "index.html", "vedamandir.html", "video-player.html"]);
const pages = fs.readdirSync(FRONTEND).filter(f => f.endsWith(".html") && !SKIP_PAGES.has(f));
const read = p => fs.readFileSync(p, "utf8");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

test("public pages have the pre-rendered header and shared head block (run: node scripts/prerender-header.js)", () => {
  for (const page of pages) {
    const html = read(path.join(FRONTEND, page));
    assert.ok(html.includes("<!-- ss-head:start"), page + ": missing shared head block");
    assert.ok(html.includes("<!-- ss-header:start"), page + ": header is not pre-rendered");
    assert.ok(!/<div id="site-header"><\/div>/.test(html), page + ": empty header placeholder");
  }
});

test("no render-blocking third-party stylesheets or fonts", () => {
  for (const page of pages) {
    const html = read(path.join(FRONTEND, page));
    const external = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m => m[0]).filter(l => /href="https?:\/\//.test(l));
    assert.deepEqual(external, [], page + ": external stylesheet found: " + external.join(" "));
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), page + ": uses Google Fonts (fonts are self-hosted)");
  }
});

test("every page loads CSS/JS with the same cache-busting version", () => {
  const versions = new Set();
  for (const page of pages) for (const m of read(path.join(FRONTEND, page)).matchAll(/(?:assets|content)\/[^"?]+\.(?:css|js)\?v=([^"]+)"/g)) versions.add(m[1]);
  assert.ok(versions.size <= 1, "mixed ?v= versions: " + [...versions].join(", ") + " (run node scripts/prerender-header.js)");
});

test("images stay light (max 250 KB each, keep hero/gallery photos optimised .webp)", () => {
  const allow = new Set();
  const heavy = walk(path.join(ASSETS, "images"))
    .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && fs.statSync(f).size > 250 * 1024 && !allow.has(path.basename(f)))
    .map(f => path.relative(ASSETS, f) + " (" + Math.round(fs.statSync(f).size / 1024) + " KB)");
  assert.deepEqual(heavy, [], "compress these images: " + heavy.join(", "));
});

test("every <img> in the public pages reserves space (width + height) so nothing jumps", () => {
  const missing = [];
  for (const page of pages) {
    for (const m of read(path.join(FRONTEND, page)).matchAll(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)) {
      const tag = m[0];
      if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
        if (/style="[^"]*(width|height)/.test(tag)) continue;   // sized by inline style
        missing.push(page + ": " + tag.slice(0, 80));
      }
    }
  }
  assert.deepEqual(missing, [], "add width/height to: \n" + missing.join("\n"));
});

test("site code budgets: JS <= 450 KB, page CSS <= 260 KB (before compression)", () => {
  const size = f => fs.statSync(f).size;
  const js = walk(path.join(ASSETS, "js")).filter(f => f.endsWith(".js") && !/admin/.test(f)).reduce((s, f) => s + size(f), 0);
  assert.ok(js <= 450 * 1024, "public JS is " + Math.round(js / 1024) + " KB");
  for (const page of pages) {
    const css = [...read(path.join(FRONTEND, page)).matchAll(/href="(assets\/css\/[^"?]+\.css)/g)]
      .reduce((s, m) => s + size(path.join(FRONTEND, m[1])), 0);
    assert.ok(css <= 260 * 1024, page + ": CSS is " + Math.round(css / 1024) + " KB");
  }
});

test("no unused files left in frontend/assets (images in packages/temples/pujas/reviews/icons folders are managed from the admin)", () => {
  const managed = /assets[\\/]images[\\/](packages|temples|pujas|reviews|icons|hero)[\\/]/;
  const code = walk(path.resolve(__dirname, ".."))
    .filter(f => /\.(html|js|css|json)$/.test(f) && !/node_modules|public-build|[\\/]\.git[\\/]|package-lock|[\\/]scratch[\\/]|[\\/]tests?[\\/]/.test(f))
    .map(f => read(f)).join("\n");
  const unused = walk(ASSETS)
    .filter(f => !managed.test(f) && !/README|css[\\/]bundles|[\\/]js[\\/]cms\.js$/.test(f))   // cms.js is checked by tests/e2e
    .filter(f => !code.includes(path.basename(f)))
    .map(f => path.relative(FRONTEND, f));
  assert.deepEqual(unused, [], "delete unused files (node scripts/remove-unused-files.js can help): " + unused.join(", "));
});
