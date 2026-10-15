const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const FRONTEND = path.resolve(__dirname, "../frontend");
const read = f => fs.readFileSync(path.join(FRONTEND, f), "utf8");

test("no page contains a broken replacement character", () => {
  for (const f of fs.readdirSync(FRONTEND).filter(f => f.endsWith(".html")))
    assert.ok(!read(f).includes("�"), f + " has a broken character");
});

test("public pages have canonical + share tags; private pages are noindex", () => {
  for (const f of ["home.html", "puja.html", "package.html", "about.html", "terms.html", "privacy.html", "refund.html"]) {
    const h = read(f);
    assert.ok(h.includes('rel="canonical"') && h.includes('property="og:title"') && h.includes('property="og:image"'), f);
  }
  for (const f of ["account.html", "login.html", "payment.html", "booking.html"])
    assert.ok(read(f).includes('content="noindex,nofollow"'), f + " should be noindex");
});

test("robots.txt, sitemap.xml and 404.html exist", () => {
  assert.match(read("robots.txt"), /Sitemap: https:\/\/www\.shubhasankalpam\.com\/sitemap\.xml/);
  assert.match(read("sitemap.xml"), /<urlset/);
  assert.match(read("404.html"), /Page not found/);
});

test("vercel.json sets security headers", () => {
  const v = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../vercel.json"), "utf8"));
  const keys = v.headers.flatMap(h => h.headers.map(x => x.key));
  for (const k of ["X-Content-Type-Options", "X-Frame-Options", "Strict-Transport-Security", "Referrer-Policy"]) assert.ok(keys.includes(k), k);
});

test("home page tells Google the site name (JSON-LD) and brand keywords", () => {
  const h = read("home.html");
  assert.ok(h.includes('"@type":"WebSite"') && h.includes("Shubha Sankalpam") && h.includes("శుభ సంకల్పం"));
});

test("puja details gallery opens a zoomable viewer", () => {
  const js = read("assets/js/pages/details.js"), css = read("assets/css/puja-details.css");
  assert.ok(js.includes("ss-zoom") && js.includes("data-zoom-index") && css.includes(".ss-zoom"));
});

test("puja details uses clean URLs (/puja-details/001)", () => {
  assert.ok(read("puja-details.html").includes('<base href="/">'));
  assert.ok(read("assets/js/cards.js").includes("/puja-details/${encodeURIComponent(ref)}"));
  assert.ok(read("assets/js/main.js").includes("puja-details"));
  const v = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../vercel.json"), "utf8"));
  assert.ok(v.rewrites.some(r => r.source === "/puja-details/:id" && r.destination === "/puja-details.html"));
});

test("bookings keep a saved copy of the puja; pending bookings of deleted pujas are hidden", () => {
  const acct = read("assets/js/pages/account.js");
  const ctl = fs.readFileSync(path.resolve(__dirname, "../backend/controllers/bookingController.js"), "utf8");
  const cms = fs.readFileSync(path.resolve(__dirname, "../backend/controllers/cmsController.js"), "utf8");
  assert.ok(ctl.includes('"Snapshot: "'), "new bookings must store a Snapshot line");
  assert.ok(cms.includes("keepBookingSnapshots(PUJAS_FILE_PATH"), "deleting a puja must save snapshots first");
  assert.ok(acct.includes("bookingPujaStillListed") && acct.includes("Not provided"));
  assert.ok(!acct.includes("'N/A'"), "no bare N/A gotram label");
});

test("deleted pujas are archived in Supabase and reports exist", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/20261011_keep_deleted_pujas.sql"), "utf8");
  for (const needle of ["ss_puja_archive", "BEFORE DELETE ON public.%I", "ss_puja_summary", "ss_booking_report", "ss_record_history"])
    assert.ok(sql.includes(needle), needle);
});

test('legal and contact pages: support email, no placeholders, listed in sitemap', () => {
  const fs = require('fs'), path = require('path');
  const read = f => fs.readFileSync(path.join(__dirname, '..', 'frontend', f), 'utf8');
  for (const f of ['privacy.html', 'terms.html', 'contact.html']) {
    const h = read(f);
    assert.ok(h.includes('support@shubhasankalpam.com'), f + ' shows the support email');
    assert.ok(!h.includes('[OFFICIAL EMAIL ADDRESS]'), f + ' has no email placeholder');
    assert.ok(!h.includes('�'), f + ' has no broken characters');
  }
  assert.ok(read('privacy.html').includes('GOWTHRIX INNOVATIONS PRIVATE LIMITED'));
  assert.ok(/<h1>Terms and Conditions<\/h1>/.test(read('terms.html')), 'terms page has its own title');
  assert.ok(read('sitemap.xml').includes('/contact.html'), 'contact page in sitemap');
  assert.ok(read('assets/js/navbar.js').includes('<a href="contact.html">'), 'footer links to the Contact page');
});
