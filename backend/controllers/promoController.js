/* ================================================================
   PROMO CONTROLLER
   - devotee:  POST /api/promo/validate  { code, ref }  -> what the code would take off (nothing is saved)
   - admin:    list / create / update / delete promo codes
   The booking itself re-checks the code on the server (bookingController.create), so the browser can never
   set its own discount.
   ================================================================ */
const { send, readBody } = require("../utils/http");
const promoModel = require("../models/promoModel");
const catalog = require("../utils/catalog");
const { normalizeCode, evaluatePromo, sanitizePromo, generateCode } = require("../utils/promo");

/* the one routine both "Apply" and "create booking" use */
async function checkCode({ code, ref, puja, phone, exceptBookingId }) {
  const c = normalizeCode(code);
  if (!c) return { ok: false, error: "Enter a promo code." };
  const item = catalog.resolveItem(ref, puja);
  if (!item) return { ok: false, error: "Please choose a valid puja." };
  if (catalog.isPackage(item)) return { ok: false, error: "Promo codes apply to pujas, not monthly packages." };
  const promo = await promoModel.get(c);
  if (!promo) return { ok: false, error: "This promo code is not valid." };
  const [usage, hasPaidBefore] = await Promise.all([
    promoModel.usage(c, phone, exceptBookingId),
    promo.audience === "first_time" ? promoModel.hasPaidBefore(phone) : false
  ]);
  const result = evaluatePromo({ promo, item, phone, usage, hasPaidBefore });
  return result.ok ? { ...result, item } : result;
}

/* POST /api/promo/validate */
const attempts = new Map(); // phone -> [timestamps]: stops someone guessing codes
function tooMany(phone) {
  const now = Date.now(), list = (attempts.get(phone) || []).filter(t => now - t < 60000);
  list.push(now); attempts.set(phone, list);
  return list.length > 20;
}
async function validate(req, res) {
  if (tooMany(String(req.userPhone || ""))) return send(res, 429, { error: "Too many attempts. Please wait a minute and try again." });
  const { code, ref, puja } = await readBody(req);
  let out;
  try { out = await checkCode({ code, ref, puja, phone: req.userPhone }); }
  catch (e) { return send(res, e.status || 500, { error: e.message }); }
  if (!out.ok) return send(res, 400, { ok: false, error: out.error });
  send(res, 200, { ok: true, code: out.code, off: out.off, originalPrice: out.originalPrice, finalPrice: out.finalPrice, label: out.label });
}

/* ---------------- admin ---------------- */
async function adminList(req, res) {
  try {
    const rows = await promoModel.list();
    const withUsage = await Promise.all(rows.map(async p => {
      const u = await promoModel.usage(p.code, "").catch(() => ({ total: 0, paid: 0 }));
      return { ...p, used: u.total, paidUses: u.paid };
    }));
    send(res, 200, { promos: withUsage });
  } catch (e) { send(res, e.status || 500, { error: e.message }); }
}

async function adminCreate(req, res) {
  const body = await readBody(req);
  try {
    let promo;
    if (!String(body.code || "").trim()) {
      // "auto-generate": make a code that does not exist yet
      for (let i = 0; i < 8; i++) {
        const candidate = generateCode();
        if (!(await promoModel.get(candidate))) { body.code = candidate; break; }
      }
      if (!body.code) return send(res, 500, { error: "Could not generate a unique code. Try again." });
    }
    promo = sanitizePromo(body);
    await promoModel.create(promo);
    send(res, 201, { ok: true, promo });
  } catch (e) { send(res, e.status || 400, { error: e.message }); }
}

async function adminUpdate(req, res) {
  const body = await readBody(req);
  try {
    const existing = await promoModel.get(body.code);
    if (!existing) return send(res, 404, { error: "Promo code not found." });
    const promo = sanitizePromo({ ...body, code: existing.code }, existing);
    await promoModel.update(promo);
    send(res, 200, { ok: true, promo });
  } catch (e) { send(res, e.status || 400, { error: e.message }); }
}

async function adminDelete(req, res, url) {
  const code = normalizeCode(url && url.searchParams.get("code"));
  if (!code) return send(res, 400, { error: "Missing code." });
  try { await promoModel.remove(code); send(res, 200, { ok: true }); }
  catch (e) { send(res, e.status || 500, { error: e.message }); }
}

/* GET /api/admin/promos/generate -> a fresh unused code to show in the form */
async function adminGenerate(req, res) {
  try {
    for (let i = 0; i < 8; i++) {
      const code = generateCode();
      if (!(await promoModel.get(code))) return send(res, 200, { code });
    }
    send(res, 500, { error: "Could not generate a unique code. Try again." });
  } catch (e) { send(res, e.status || 500, { error: e.message }); }
}

module.exports = { checkCode, validate, adminList, adminCreate, adminUpdate, adminDelete, adminGenerate };
