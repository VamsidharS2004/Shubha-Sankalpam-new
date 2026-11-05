process.env.ALLOW_LOCAL_DATA = "true";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

/* a tiny fake Supabase that keeps rows in a Map per table */
function fakeDb() {
  const tables = { ss_login_otps: new Map(), ss_login_sessions: new Map() };
  const from = name => {
    const t = tables[name];
    let filter = null, since = null, mode = null, patch = null;
    const q = {
      upsert: async row => { t.set(row.phone, { ...row }); return { error: null }; },
      select: () => { mode = "select"; return q; },
      update: p => { mode = "update"; patch = p; return q; },
      delete: () => { mode = "delete"; return q; },
      eq: (c, v) => { filter = v; if (mode === "update") { const r = t.get(v); if (r) Object.assign(r, patch); return Promise.resolve({ error: null }); } if (mode === "delete") { t.delete(v); return Promise.resolve({ error: null }); } return q; },
      maybeSingle: async () => ({ data: t.get(filter) || null, error: null }),
      gte: (c, v) => { since = v; return q; }, order: () => q,
      limit: async () => ({ data: [...t.values()].filter(r => !since || r.last_active_at >= since), error: null })
    };
    return q;
  };
  return { from, tables };
}

test("an OTP requested on one server copy can be verified on another (stored in the database, not in one copy's memory)", async () => {
  const m = require("../backend/models/loginStateModel");
  const db = fakeDb(); m._setClient(db); m._reset();
  await m.saveOtp("919876543210", { otpHash: "h", email: "", expires: Date.now() + 60000, attempts: 0 });
  m._reset(); // the other copy has an empty memory
  const got = await m.getOtp("919876543210");
  assert.equal(got.otpHash, "h");
  await m.bumpOtpAttempts("919876543210", 2);
  m._reset();
  assert.equal((await m.getOtp("919876543210")).attempts, 2);
  await m.deleteOtp("919876543210");
  assert.equal(await m.getOtp("919876543210"), null);
});

test("logins of the last 24 hours are kept in the database and listed for the admin", async () => {
  const m = require("../backend/models/loginStateModel");
  const db = fakeDb(); m._setClient(db); m._reset();
  await m.recordLoginSession("919876543210", "Ravi");
  m._reset();
  const list = await m.recentSessions();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Ravi");
});

test("when the database tables are missing, login still works from memory (old behaviour)", async () => {
  const m = require("../backend/models/loginStateModel");
  const broken = { from: () => ({ upsert: async () => ({ error: new Error("relation does not exist") }), select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: new Error("relation does not exist") }) }) }) }) };
  m._setClient(broken); m._reset();
  const origErr = console.error; console.error = () => {};
  try {
    await m.saveOtp("911111111111", { otpHash: "x", email: "", expires: Date.now() + 60000, attempts: 0 });
    assert.equal((await m.getOtp("911111111111")).otpHash, "x");
  } finally { console.error = origErr; }
});

test("login controller and admin sessions use the shared login state; migration exists", () => {
  const auth = fs.readFileSync(path.join(__dirname, "../backend/controllers/authController.js"), "utf8");
  assert.match(auth, /loginState\.saveOtp/);
  assert.match(auth, /loginState\.getOtp/);
  assert.match(auth, /loginState\.recordLoginSession/);
  assert.ok(!/pendingOtps/.test(auth));
  assert.match(fs.readFileSync(path.join(__dirname, "../backend/controllers/analyticsController.js"), "utf8"), /recentSessions/);
  assert.match(fs.readFileSync(path.join(__dirname, "../backend/migrations/20261103_login_state.sql"), "utf8"), /ss_login_otps/);
});

test("the puja a logged-in devotee opens is kept in the database and shown to the admin from any server copy", async () => {
  const m = require("../backend/models/loginStateModel");
  const db = fakeDb(); m._setClient(db); m._reset();
  await m.recordLoginSession("919876543210", "Ravi");
  await m.recordPujaView("919876543210", "Ravi", { pujaId: "001-te", pujaName: "Satyanarayana Vratam", lang: "te" });
  await m.recordPujaView("919876543210", "Ravi", { pujaId: "001-te", pujaName: "Satyanarayana Vratam", lang: "te" });
  await m.recordPujaView("919876543210", "Ravi", { pujaId: "002-te", pujaName: "Rudrabhishekam", lang: "te" });
  m._reset();
  const list = await m.recentSessions();
  assert.equal(list.length, 1);
  assert.equal(list[0].viewedPujas.length, 2);
  assert.equal(list[0].viewedPujas[0].pujaName, "Rudrabhishekam");
  assert.equal(list[0].viewedPujas[1].viewCount, 2);
});

test("dashboard has a Logged-in Devotees list (name, mobile, puja opened) and the migration adds the column", () => {
  const html = fs.readFileSync(path.join(__dirname, "../backend/admin.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../frontend/assets/js/admin.js"), "utf8");
  const sql = fs.readFileSync(path.join(__dirname, "../backend/migrations/20261103_login_state.sql"), "utf8");
  assert.match(html, /id="dashDevoteesTbody"/);
  assert.match(js, /window\.renderDashboardDevotees/);
  assert.match(sql, /viewed_pujas/);
  assert.match(fs.readFileSync(path.join(__dirname, "../backend/controllers/analyticsController.js"), "utf8"), /recordPujaView/);
});
