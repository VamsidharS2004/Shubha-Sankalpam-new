/* ================================================================
   PROMO CODE RULES — pure functions, no database, easy to test.
   ================================================================
   A promo code never changes a puja's own price. It is worked out on the server when a booking is created,
   and the discounted amount becomes the booking's price (the amount Razorpay / UPI then charges).

   Code shape (as stored / sent by the admin panel):
     code      "FIRST"  (upper case letters, digits, - and _ ; 3-24 characters)
     kind      "percent" | "flat"
     value     percent (1-100) or rupees off
     maxOff    optional rupee cap for a percent code (0 / empty = no cap)
     scope     "all" (every puja) | "selected" (only the pujas in `items`)
     items     puja ids (or names) the code is limited to when scope is "selected"
     audience  "anyone" | "first_time" (devotees with no paid booking yet) | "phone" (one mobile number only)
     phone     the 10-digit mobile number when audience is "phone"
     maxUses   total number of bookings that may use it (0 / empty = unlimited)
     perUser   times one mobile number may use it (default 1)
     startsAt / expiresAt   optional dates
     active    switch on/off
   ================================================================ */

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L - easy to read out over the phone

function normalizeCode(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, "");
}

function tenDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

/* random code such as SS7KQ4M2XP (used by the admin "Generate" button and the server fallback) */
function generateCode(length = 8, random = Math.random) {
  let out = "SS";
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/* the list of mobile numbers a personal code is limited to (stored as "n1,n2,..." in the phone column) */
function splitNumbers(text) {
  /* commas / semicolons / new lines separate numbers; plain 10-digit numbers separated only by spaces are split too */
  return String(text || "").split(/[,;\n\r]+/).flatMap(t => /^\s*\d{10}(\s+\d{10})+\s*$/.test(t) ? t.trim().split(/\s+/) : [t]);
}
function promoPhones(promo) {
  if (Array.isArray(promo.phones) && promo.phones.length) return promo.phones.map(tenDigits);
  return splitNumbers(promo.phone).map(tenDigits).filter(Boolean);
}

/* cleans what the admin panel sends; throws an Error with a plain message when something is wrong */
function sanitizePromo(input, existing) {
  const p = input || {};
  const code = normalizeCode(p.code);
  if (!CODE_RE.test(code)) throw new Error("Code must be 3-24 characters: letters, numbers, - or _.");
  const kind = p.kind === "flat" ? "flat" : "percent";
  const value = Math.floor(Number(p.value));
  if (!Number.isFinite(value) || value < 1) throw new Error("Enter the discount amount.");
  if (kind === "percent" && value > 100) throw new Error("A percentage discount cannot be more than 100.");
  const scope = p.scope === "selected" ? "selected" : "all";
  const items = scope === "selected"
    ? [...new Set((Array.isArray(p.items) ? p.items : []).map(v => String(v || "").trim()).filter(Boolean))]
    : [];
  if (scope === "selected" && !items.length) throw new Error("Choose at least one puja, or set the code for all pujas.");
  const audience = ["first_time", "phone"].includes(p.audience) ? p.audience : "anyone";
  /* one or many mobile numbers (a list, or text separated by commas / spaces / new lines) */
  let phones = [];
  if (audience === "phone") {
    const raw = Array.isArray(p.phones) ? p.phones : splitNumbers(p.phones != null ? p.phones : p.phone);
    const bad = [];
    raw.map(v => String(v || "").trim()).filter(Boolean).forEach(v => { const n = tenDigits(v); if (/^[6-9]\d{9}$/.test(n)) { if (!phones.includes(n)) phones.push(n); } else bad.push(v); });
    if (bad.length) throw new Error("These are not valid 10-digit mobile numbers: " + bad.slice(0, 3).join(", ") + (bad.length > 3 ? "…" : ""));
    if (!phones.length) throw new Error("Enter at least one valid 10-digit mobile number for this code.");
    if (phones.length > 500) throw new Error("A code can have up to 500 mobile numbers.");
  }
  const phone = phones.join(",");
  const date = v => {
    if (!v) return null;
    const t = new Date(v);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  };
  const startsAt = date(p.startsAt), expiresAt = date(p.expiresAt);
  if (startsAt && expiresAt && expiresAt <= startsAt) throw new Error("The end date must be after the start date.");
  return {
    code, kind, value,
    maxOff: kind === "percent" ? Math.max(0, Math.floor(Number(p.maxOff)) || 0) : 0,
    scope, items, audience, phone, phones,
    maxUses: Math.max(0, Math.floor(Number(p.maxUses)) || 0),
    perUser: Math.max(1, Math.floor(Number(p.perUser)) || 1),
    startsAt, expiresAt,
    active: p.active !== false,
    note: String(p.note || "").trim().slice(0, 200),
    createdAt: (existing && existing.createdAt) || new Date().toISOString()
  };
}

/* The one place that decides whether a code works for this devotee and puja.
   ctx = { promo, item:{id,name,price}, phone, usage:{total, byPhone}, hasPaidBefore, now }
   returns { ok:true, code, off, finalPrice, label } or { ok:false, error } */
function evaluatePromo(ctx) {
  const { promo, item } = ctx;
  const now = ctx.now ? new Date(ctx.now) : new Date();
  const fail = error => ({ ok: false, error });
  if (!promo) return fail("This promo code is not valid.");
  if (!promo.active) return fail("This promo code is not active.");
  if (promo.startsAt && now < new Date(promo.startsAt)) return fail("This promo code is not active yet.");
  if (promo.expiresAt && now > new Date(promo.expiresAt)) return fail("This promo code has expired.");
  const price = Number(item && item.price);
  if (!Number.isFinite(price) || price <= 1) return fail("This promo code cannot be used for this puja.");
  if (promo.scope === "selected") {
    const keys = [item.id, item.name, item.title_en, item.title_te].filter(Boolean).map(String);
    if (!(promo.items || []).some(x => keys.includes(String(x)))) return fail("This promo code is not valid for this puja.");
  }
  if (promo.audience === "phone" && !promoPhones(promo).includes(tenDigits(ctx.phone))) return fail("This promo code is not valid for your mobile number.");
  if (promo.audience === "first_time" && ctx.hasPaidBefore) return fail("This promo code is only for first-time devotees.");
  const usage = ctx.usage || {};
  if (promo.maxUses > 0 && (usage.total || 0) >= promo.maxUses) return fail("This promo code has reached its usage limit.");
  if ((usage.byPhone || 0) >= (promo.perUser || 1)) return fail("You have already used this promo code.");
  let off = promo.kind === "flat" ? promo.value : Math.floor(price * promo.value / 100);
  if (promo.kind === "percent" && promo.maxOff > 0) off = Math.min(off, promo.maxOff);
  off = Math.max(0, Math.min(off, price - 1)); // the customer always pays at least Rs 1
  if (off < 1) return fail("This promo code gives no discount on this puja.");
  return {
    ok: true,
    code: promo.code,
    off,
    originalPrice: price,
    finalPrice: price - off,
    label: promo.kind === "percent" ? `${promo.value}% off` : `₹${promo.value} off`
  };
}

/* the line stored in a booking's notes, and how to read it back */
function promoNoteLine(result) {
  return "Promo: " + JSON.stringify({ code: result.code, off: result.off, list: result.originalPrice });
}
function parsePromoNote(notes) {
  const m = String(notes || "").match(/^Promo:\s*(\{.*\})\s*$/m);
  if (!m) return null;
  try {
    const v = JSON.parse(m[1]);
    return v && v.code ? { code: String(v.code), off: Number(v.off) || 0, list: Number(v.list) || 0 } : null;
  } catch (_) { return null; }
}

/* A booking that used a promo is charged the list price minus the promo amount; this checks a stored booking
   price against the puja's current price (used before creating a payment order). */
function expectedPrice(currentPrice, promo) {
  return promo ? Number(currentPrice) - Number(promo.off || 0) : Number(currentPrice);
}

module.exports = { promoPhones, CODE_RE, normalizeCode, tenDigits, generateCode, sanitizePromo, evaluatePromo, promoNoteLine, parsePromoNote, expectedPrice };
