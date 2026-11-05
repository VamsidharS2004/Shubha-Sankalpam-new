process.env.AISENSY_API_KEY = "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const wc = require("../backend/utils/whatsappCampaign");
const ctl = require("../backend/controllers/whatsappCampaignController");
const root = path.join(__dirname, "..");

const live = { id: "001", language: "te", name: "శ్రీ రాజశ్యామల చండీ హోమం", muhurat: "2099-10-20T07:00:00+05:30", image: "https://cdn.example/p.webp" };
const ended = { id: "002", language: "en", name: "Old Puja", muhurat: "2020-01-01T07:00:00+05:30", image: "https://cdn.example/o.webp" };

const mkres = () => { const o = { status: 0, body: null }; o.writeHead = s => { o.status = s; }; o.setHeader = () => {}; o.end = d => { try { o.body = JSON.parse(d); } catch (e) {} }; o.req = { headers: {} }; return o; };
const mkreq = body => { const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.headers = {}; return r; };

test("the four templates have their AiSensy names (env can rename them)", () => {
  assert.equal(wc.templateName("open", "te", {}), "puja_open_te");
  assert.equal(wc.templateName("reminder", "en", {}), "puja_reminder_en");
  assert.equal(wc.templateName("open", "en", { AISENSY_PUJA_OPEN_EN: "my_open" }), "my_open");
  assert.equal(wc.templateName("open", "hi", {}), null);
});

test("link is the readable puja address and the photo is an https address", () => {
  assert.equal(wc.pujaLink(live, {}), "https://www.shubhasankalpam.com/puja-details/001-te");
  assert.equal(wc.pujaLink({ id: "005-en", language: "en" }, {}), "https://www.shubhasankalpam.com/puja-details/005-en");
  assert.equal(wc.pujaImage({ image: "assets/images/a.webp" }, {}), "https://www.shubhasankalpam.com/assets/images/a.webp");
  assert.equal(wc.pujaImage({ image: "http://insecure/x.jpg" }, {}), "");
});

test("template values are one clean line (no new lines, tabs, braces or long gaps)", () => {
  assert.equal(wc.cleanField("a\nb\t c   d {{x}}"), "a b c d x");
  assert.throws(() => wc.buildParams(["h", "d", "", "date"], "https://x.y/z"), /offer line is empty/);
  assert.throws(() => wc.buildParams(["h", "d", "o", "date"], "http://x"), /link is missing/);
  assert.deepEqual(wc.buildParams(["h", "d", "o", "date"], "https://x.y/z"), ["h", "d", "o", "date", "https://x.y/z"]);
});

test("suggested wording uses the puja name and the date in the chosen language", () => {
  const te = wc.defaultFields(live, "open", "te");
  assert.equal(te.length, 4);
  assert.ok(te[0].includes(live.name));
  assert.equal(te[3], "20 అక్టోబర్ 2099");
  assert.equal(wc.defaultFields(live, "reminder", "en")[3], "October 20, 2099");
  assert.match(wc.defaultFields(live, "reminder", "en")[0], /Last call/);
  te.forEach(v => assert.ok(!/[\n\t]/.test(v)));
});

test("mobile numbers are cleaned, de-duplicated and invalid ones are reported", () => {
  const r = wc.normalizePhones(["98765 43210", "+91 9876543210", "09123456789", "12345", "", "919000000001"]);
  assert.deepEqual(r.valid, ["9876543210", "9123456789", "9000000001"]);
  assert.deepEqual(r.invalid, ["12345"]);
});

async function withFetch(fn) {
  const calls = []; const real = global.fetch;
  global.fetch = async (u, o) => { calls.push({ u: String(u), body: JSON.parse(o.body) }); return new Response("{}", { status: 200 }); };
  try { await fn(calls); } finally { global.fetch = real; }
}

test("sending: one template call per number with the 5 values, the photo and the right campaign", async () => {
  ctl._setLoader(() => [live, ended]);
  await withFetch(async calls => {
    const res = mkres();
    await ctl.sendMessages(mkreq({ kind: "open", lang: "te", pujaId: "001", fields: ["H", "D", "O", "20 అక్టోబర్ 2099"], phones: ["9876543210", "9123456789"] }), res);
    assert.equal(res.status, 200);
    assert.equal(res.body.sent, 2);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.campaignName, "puja_open_te");
    assert.equal(calls[0].body.destination, "919876543210");
    assert.deepEqual(calls[0].body.templateParams, ["H", "D", "O", "20 అక్టోబర్ 2099", "https://www.shubhasankalpam.com/puja-details/001-te"]);
    assert.equal(calls[0].body.media.url, "https://cdn.example/p.webp");
  });
});

test("sending is refused for ended pujas, empty lines, too many numbers and bad numbers", async () => {
  ctl._setLoader(() => [live, ended]);
  await withFetch(async calls => {
    const send = async body => { const r = mkres(); await ctl.sendMessages(mkreq(body), r); return r; };
    assert.equal((await send({ kind: "open", lang: "en", pujaId: "002", fields: ["a", "b", "c", "d"], phones: ["9876543210"] })).status, 400);
    assert.equal((await send({ kind: "open", lang: "te", pujaId: "001", fields: ["a", "b", "", "d"], phones: ["9876543210"] })).status, 400);
    assert.equal((await send({ kind: "open", lang: "te", pujaId: "001", fields: ["a", "b", "c", "d"], phones: Array.from({ length: 11 }, (_, i) => "98765432" + (10 + i)) })).status, 400);
    assert.equal((await send({ kind: "open", lang: "te", pujaId: "001", fields: ["a", "b", "c", "d"], phones: ["123"] })).status, 400);
    assert.equal((await send({ kind: "promo", lang: "te", pujaId: "001", fields: ["a", "b", "c", "d"], phones: ["9876543210"] })).status, 400);
    assert.equal(calls.length, 0, "nothing may be sent when a check fails");
  });
});

test("the admin list shows only live pujas and the preview gives wording, link and photo", async () => {
  ctl._setLoader(() => [live, ended]);
  let res = mkres(); await ctl.status({}, res);
  assert.equal(res.body.pujas.length, 1);
  assert.equal(res.body.templates.reminder_en, "puja_reminder_en");
  res = mkres(); await ctl.preview({}, res, new URL("http://x/api/admin/whatsapp/preview?pujaId=001&kind=reminder&lang=te"));
  assert.equal(res.body.campaign, "puja_reminder_te");
  assert.equal(res.body.fields.length, 4);
  assert.match(res.body.link, /puja-details\/001-te$/);
});

test("admin WhatsApp tab and routes are wired, behind the admin key", () => {
  const html = fs.readFileSync(path.join(root, "backend/admin.html"), "utf8");
  const api = fs.readFileSync(path.join(root, "backend/routes/api.js"), "utf8");
  assert.match(html, /data-target="view-whatsapp"/);
  assert.match(html, /id="view-whatsapp"/);
  assert.match(html, /admin-whatsapp\.js\?v=/);
  ["", "/preview", "/send"].forEach(s => assert.match(api, new RegExp('"/api/admin/whatsapp' + s + '", middleware: \\[adminOnly\\]')));
  const js = fs.readFileSync(path.join(root, "frontend/assets/js/admin-whatsapp.js"), "utf8");
  assert.match(js, /SEND/);
  new Function(js);
});
