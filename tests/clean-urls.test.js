const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

/* load the id helpers from main.js with a small fake page */
function helpers(pujas, packages) {
  const src = read("frontend/assets/js/main.js");
  const grab = name => { const i = src.indexOf("function " + name); let d = 0, j = src.indexOf("{", i); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; if (src[k] === "}" && --d === 0) return src.slice(i, k + 1); } };
  const ctx = { pujas, packages };
  vm.runInNewContext(grab("ssPujaSlug") + "\n" + grab("getItem") + "\nthis.ssPujaSlug=ssPujaSlug;this.getItem=getItem;", ctx);
  return ctx;
}

test("a puja address is its id plus the language (001-te, 001-hi, 001-en); the stored id is not changed", () => {
  const h = helpers([{ id: "001", language: "te" }, { id: "001-hi", language: "hi" }, { id: "abc", language: "en" }, { id: "xyz" }], []);
  assert.equal(h.ssPujaSlug({ id: "001", language: "te" }), "001-te");
  assert.equal(h.ssPujaSlug({ id: "001-hi", language: "hi" }), "001-hi");
  assert.equal(h.ssPujaSlug({ id: "abc", language: "en" }), "abc-en");
  assert.equal(h.ssPujaSlug({ id: "xyz" }), "xyz-en");
});

test("old ids and the new readable ids both find the same puja; the wrong language finds nothing", () => {
  const te = { id: "001", language: "te" };
  const h = helpers([te, { id: "002-hi", language: "hi" }], [{ id: "pk", language: "en" }]);
  assert.equal(h.getItem("001").item, te);
  assert.equal(h.getItem("001-te").item, te);
  assert.equal(h.getItem("001-hi").item, null);
  assert.equal(h.getItem("002-hi").item.id, "002-hi");
  assert.equal(h.getItem("pk-en").type, "pkg");
});

test("/book/<id>-<language> opens the booking form on the server and on Vercel; old booking.html?id= links still work", () => {
  assert.match(read("backend/server.js"), /\^\\\/book\\\/\[\^\\\/\]\+\\\/\?\$/);
  const v = JSON.parse(read("vercel.json"));
  assert.ok(v.rewrites.some(r => r.source === "/book/:id" && r.destination === "/booking.html"));
  assert.ok(read("frontend/booking.html").includes('<base href="/">'));
  const js = read("frontend/assets/js/booking.js");
  assert.match(js, /history\.replaceState\(null, "", want/);
  assert.match(read("frontend/assets/js/main.js"), /\(\?:puja-details\|book\)/);
});

test("Book Now, cards, share and the home banner use the readable address", () => {
  assert.match(read("frontend/assets/js/pages/details.js"), /"\/book\/" \+ encodeURIComponent/);
  assert.match(read("frontend/assets/js/cards.js"), /ssPujaSlug\(p\)/);
  assert.match(read("frontend/assets/js/pages/home.js"), /ssPujaSlug\(firstPuja\)/);
  assert.match(read("frontend/assets/js/navbar.js"), /\^\\\/book\\\//);
});
