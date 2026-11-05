const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "frontend/assets/js/admin-where-shows.js"), "utf8");
const html = fs.readFileSync(path.join(root, "backend/admin.html"), "utf8");

test("admin where-shows script is syntactically valid and loaded by admin.html", () => {
  new Function(js);
  assert.match(html, /admin-where-shows\.js\?v=/);
});
test("every admin section has a where-it-shows banner", () => {
  ["dashboard","bookings","devotees","pujas","packages","temples","settings","cms","booking-form","promos","analytics"].forEach(id => {
    assert.ok(js.includes('"view-' + id + '"'), id);
    assert.ok(html.includes('id="view-' + id + '"'), id);
  });
});
test("every site setting field has a note", () => {
  ["BRAND","DOMAIN","WHATSAPP","CALL","SUPPORT_EMAIL","LOGO","FOOTER_LOGO","DEFAULT_LANGUAGE","UPI_ID","UPI_NAME","META_PIXEL_ID","ADDRESS","BUSINESS_HOURS","FOOTER_DESCRIPTION","facebook","instagram","youtube","threads","x"]
    .forEach(k => assert.ok(new RegExp("\\b" + k + ":").test(js), k));
});
test("notes are additive only (no fetch / storage / value writes)", () => {
  assert.ok(!/fetch\(|localStorage|sessionStorage|\.value\s*=/.test(js.replace(/sel\.value/g, "")));
});
