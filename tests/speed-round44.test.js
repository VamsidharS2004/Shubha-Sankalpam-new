const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

test("home page HTML may be cached by the CDN for a short time (not no-store)", () => {
  const s = read("backend/server.js");
  assert.match(s, /if \(isHome\) cacheHeader = \{ "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" \}/);
});

test("Poppins uses font-display:swap so text is never held back", () => {
  const css = read("frontend/assets/css/fonts.css");
  const poppins = css.split("\n").filter(l => l.includes("font-family:'Poppins'"));
  assert.ok(poppins.length >= 8);
  assert.ok(poppins.every(l => l.includes("font-display:swap")));
});

test("background pattern photo stays small", () => {
  assert.ok(fs.statSync(path.join(root, "frontend/assets/images/bg-pattern.webp")).size < 30000);
});

test("HTML pages declare charset=utf-8 in the header (the <meta charset> sits past the first 1024 bytes)", () => {
  assert.match(read("backend/server.js"), /endsWith\("\.html"\) \? "text\/html; charset=utf-8"/);
});
