const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { state, isPublic, filterPublic } = require("../backend/utils/pujaVisibility");

const now = Date.parse("2026-10-16T12:00:00+05:30");
const past = "2026-10-10T07:00:00+05:30", future = "2026-10-20T07:00:00+05:30";

test("draft pujas are never public", () => {
  assert.equal(state({ muhurat: future, detail: { status: "draft" } }, now), "draft");
  assert.equal(isPublic({ muhurat: future, detail: { status: "draft" } }, now), false);
});
test("scheduled pujas go live automatically when the time arrives", () => {
  const p = { muhurat: future, detail: { status: "scheduled", publishAt: "2026-10-17T09:00:00+05:30" } };
  assert.equal(state(p, now), "scheduled");
  assert.equal(state(p, Date.parse("2026-10-17T09:00:01+05:30")), "live");
  assert.equal(state({ muhurat: future, detail: { status: "scheduled" } }, now), "scheduled");
});
test("past pujas are 'ended' but stay in the public catalog (accounts / old links still resolve)", () => {
  assert.equal(state({ muhurat: past, detail: {} }, now), "ended");
  assert.equal(isPublic({ muhurat: past, detail: {} }, now), true);
});
test("filterPublic removes only drafts and not-yet-live scheduled pujas", () => {
  const list = [{ id: "a", muhurat: future }, { id: "b", detail: { status: "draft" } }, { id: "c", detail: { status: "scheduled", publishAt: "2027-01-01T00:00:00+05:30" } }, { id: "d", muhurat: past }];
  assert.deepEqual(filterPublic(list, now).map(p => p.id), ["a", "d"]);
});

function loadRich() {
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../frontend/assets/js/rich-text.js"), "utf8"), { window: win, document: {} });
  return win.ssRichText;
}
test("rich text: paragraphs, bullets and headings are kept and HTML is escaped", () => {
  const rt = loadRich();
  const html = rt("# Heading\n\nFirst para\nsecond line\n\n- one\n- two <b>x</b>\n\n1. a\n2. b");
  assert.match(html, /rt-h/);
  assert.match(html, /<ul[^>]*rt-list/);
  assert.match(html, /<ol/);
  assert.ok(!html.includes("<b>x</b>"));
  assert.match(html, /&lt;b&gt;/);
});
