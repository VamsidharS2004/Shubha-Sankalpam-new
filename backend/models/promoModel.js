/* ================================================================
   PROMO MODEL — promo codes in Supabase (table ss_promo_codes), with a local JSON fallback
   (backend/promos.json) when Supabase is not configured, like the booking model.
   Usage is NOT stored separately: it is counted from the bookings themselves (each booking that used a code
   has a "Promo: {...}" line in its notes), so a cancelled booking automatically frees the code again.
   ================================================================ */
const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabase");
const { clean } = require("../utils/http");
const { normalizeCode, promoPhones } = require("../utils/promo");

const FILE = path.join(__dirname, "..", "promos.json");
const PENDING_HOLD_MS = 2 * 60 * 60 * 1000; // an unpaid booking holds a use of the code for 2 hours

function readLocal() {
  try { const v = JSON.parse(fs.readFileSync(FILE, "utf8")); return Array.isArray(v) ? v : []; } catch (_) { return []; }
}
function writeLocal(rows) {
  const text = JSON.stringify(rows, null, 2), tmp = FILE + ".tmp";
  try {
    fs.writeFileSync(tmp, text, "utf8");
    fs.renameSync(tmp, FILE);
  } catch (e) {
    /* Windows (antivirus / indexer) can refuse to rename over an existing file: write straight into it instead */
    if (!["EPERM", "EBUSY", "EACCES"].includes(e && e.code)) throw e;
    try { fs.unlinkSync(tmp); } catch (_) {}
    fs.writeFileSync(FILE, text, "utf8");
  }
}

/* database row <-> API object */
function fromRow(r) {
  return {
    code: r.code, kind: r.kind, value: r.value, maxOff: r.max_off || 0,
    scope: r.scope, items: Array.isArray(r.items) ? r.items : [],
    audience: r.audience, phone: r.phone || "", phones: promoPhones({ phone: r.phone }),
    maxUses: r.max_uses || 0, perUser: r.per_user || 1,
    startsAt: r.starts_at || null, expiresAt: r.expires_at || null,
    active: r.active !== false, note: r.note || "", createdAt: r.created_at
  };
}
function toRow(p) {
  return {
    code: p.code, kind: p.kind, value: p.value, max_off: p.maxOff, scope: p.scope, items: p.items,
    audience: p.audience, phone: p.phone || null, max_uses: p.maxUses, per_user: p.perUser,
    starts_at: p.startsAt, expires_at: p.expiresAt, active: p.active, note: p.note || null,
    created_at: p.createdAt
  };
}
const MIGRATION_HINT = "Promo codes need the database table. Run backend/migrations/20261028_promo_codes.sql in Supabase.";
function dbError(error) {
  const e = new Error(error && error.code === "42P01" ? MIGRATION_HINT : "Promo codes are unavailable right now.");
  e.status = 500;
  return e;
}

async function list() {
  if (!supabase) return readLocal().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const { data, error } = await supabase.from("ss_promo_codes").select("*").order("created_at", { ascending: false });
  if (error) throw dbError(error);
  return (data || []).map(fromRow);
}

async function get(code) {
  const c = normalizeCode(code);
  if (!c) return null;
  if (!supabase) return readLocal().find(p => p.code === c) || null;
  const { data, error } = await supabase.from("ss_promo_codes").select("*").eq("code", c).maybeSingle();
  if (error) throw dbError(error);
  return data ? fromRow(data) : null;
}

async function create(promo) {
  if (await get(promo.code)) { const e = new Error("A promo code with this name already exists."); e.status = 409; throw e; }
  if (!supabase) { const rows = readLocal(); rows.push(promo); writeLocal(rows); return promo; }
  const { error } = await supabase.from("ss_promo_codes").insert([toRow(promo)]);
  if (error) {
    if (error.code === "23505") { const e = new Error("A promo code with this name already exists."); e.status = 409; throw e; }
    throw dbError(error);
  }
  return promo;
}

async function update(promo) {
  if (!supabase) {
    const rows = readLocal(), i = rows.findIndex(p => p.code === promo.code);
    if (i < 0) return null;
    rows[i] = promo; writeLocal(rows); return promo;
  }
  const { data, error } = await supabase.from("ss_promo_codes").update(toRow(promo)).eq("code", promo.code).select("code");
  if (error) throw dbError(error);
  return data && data.length ? promo : null;
}

async function remove(code) {
  const c = normalizeCode(code);
  if (!supabase) { const rows = readLocal(); writeLocal(rows.filter(p => p.code !== c)); return true; }
  const { error } = await supabase.from("ss_promo_codes").delete().eq("code", c);
  if (error) throw dbError(error);
  return true;
}

/* bookings (id, phone, status, payment status, created) that carry this code */
async function bookingsUsing(code) {
  const c = normalizeCode(code);
  if (!supabase) {
    let rows = [];
    try { rows = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "bookings.json"), "utf8")); } catch (_) {}
    return rows.filter(b => String(b.notes || "").includes(`Promo: {"code":"${c}"`))
      .map(b => ({ id: b.id, phone: b.devotee_phone, status: b.status, payment_status: b.payment_status, created_at: b.created_at }));
  }
  const pattern = `%Promo: {"code":"${c.replace(/[\\%_]/g, m => "\\" + m)}"%`;
  const { data, error } = await supabase.from("bookings")
    .select("id, devotee_phone, status, payment_status, created_at").like("notes", pattern).limit(5000);
  if (error) throw dbError(error);
  return (data || []).map(b => ({ id: b.id, phone: b.devotee_phone, status: b.status, payment_status: b.payment_status, created_at: b.created_at }));
}

function isPaid(b) { return /paid|captured|success/i.test(String(b.payment_status || "")) || /^(confirmed|completed)$/i.test(String(b.status || "")); }
function isCancelled(b) { return /cancel/i.test(String(b.status || "")); }
function holdsUse(b, now = Date.now()) {
  if (isCancelled(b)) return false;
  if (isPaid(b)) return true;
  return now - new Date(b.created_at).getTime() < PENDING_HOLD_MS;
}

/* { total, byPhone, paid } for one code; `exceptBookingId` leaves out the booking being re-checked */
async function usage(code, phone, exceptBookingId) {
  const rows = (await bookingsUsing(code)).filter(b => b.id !== exceptBookingId && holdsUse(b));
  const p = String(phone || "").replace(/\D/g, "").slice(-10);
  return {
    total: rows.length,
    paid: rows.filter(isPaid).length,
    byPhone: rows.filter(b => String(b.phone || "").replace(/\D/g, "").slice(-10) === p).length
  };
}

/* has this mobile number already paid for a booking? (decides "first-time devotee" codes) */
async function hasPaidBefore(phone) {
  const p = clean(phone, 20);
  if (!p) return false;
  if (!supabase) {
    let rows = [];
    try { rows = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "bookings.json"), "utf8")); } catch (_) {}
    return rows.some(b => b.devotee_phone === p && isPaid(b));
  }
  const { data, error } = await supabase.from("bookings")
    .select("id, status, payment_status").eq("devotee_phone", p).limit(200);
  if (error) throw dbError(error);
  return (data || []).some(isPaid);
}

module.exports = { list, get, create, update, remove, usage, hasPaidBefore, bookingsUsing };
