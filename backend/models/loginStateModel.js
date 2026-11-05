/* ================================================================
   LOGIN STATE — OTPs waiting to be verified, and who logged in during the last 24 hours.
   Stored in Supabase (tables ss_login_otps / ss_login_sessions, see migrations/20261103_login_state.sql) so that every
   copy of the server sees the same data: on Vercel the "request OTP" and "verify OTP" calls can reach different copies.
   If the tables are missing or Supabase fails, it quietly falls back to this copy's memory (the old behaviour).
   ================================================================ */
const { supabase: realSupabase } = require("../utils/supabase");

let db = realSupabase;
const otps = new Map();      // phone -> { otpHash, email, expires, attempts }
const sessions = new Map();  // phone -> { phone, name, loginTime, lastActiveAt }
const DAY = 24 * 60 * 60 * 1000;

function warn(what, e) { console.error(`[LoginState] ${what} failed, using memory:`, (e && e.message) || e); }

async function saveOtp(phone, rec) {
  otps.set(phone, rec);
  if (!db) return;
  try {
    const { error } = await db.from("ss_login_otps").upsert({
      phone, otp_hash: rec.otpHash, email: rec.email || null,
      expires_at: new Date(rec.expires).toISOString(), attempts: rec.attempts || 0
    }, { onConflict: "phone" });
    if (error) throw error;
  } catch (e) { warn("saving OTP", e); }
}

async function getOtp(phone) {
  if (db) {
    try {
      const { data, error } = await db.from("ss_login_otps").select("*").eq("phone", phone).maybeSingle();
      if (error) throw error;
      if (data) return { otpHash: data.otp_hash, email: data.email || "", expires: new Date(data.expires_at).getTime(), attempts: data.attempts || 0 };
    } catch (e) { warn("reading OTP", e); }
  }
  return otps.get(phone) || null;
}

async function bumpOtpAttempts(phone, attempts) {
  const m = otps.get(phone); if (m) m.attempts = attempts;
  if (!db) return;
  try { const { error } = await db.from("ss_login_otps").update({ attempts }).eq("phone", phone); if (error) throw error; }
  catch (e) { warn("counting OTP attempts", e); }
}

async function deleteOtp(phone) {
  otps.delete(phone);
  if (!db) return;
  try { const { error } = await db.from("ss_login_otps").delete().eq("phone", phone); if (error) throw error; }
  catch (e) { warn("deleting OTP", e); }
}

async function recordLoginSession(phone, name) {
  const now = new Date().toISOString();
  const old = sessions.get(phone);
  sessions.set(phone, { phone, name: name || "Devotee", loginTime: now, lastActiveAt: now, viewedPujas: (old && old.viewedPujas) || [] });
  if (!db) return;
  try {
    const { error } = await db.from("ss_login_sessions").upsert({ phone, name: name || "Devotee", login_time: now, last_active_at: now }, { onConflict: "phone" });
    if (error) throw error;
  } catch (e) { warn("saving login session", e); }
}

/* which puja a logged-in devotee opened (kept in the same row, newest first, at most 20 pujas) */
async function recordPujaView(phone, name, view) {
  const id = String((view && view.pujaId) || "").trim();
  const title = String((view && (view.pujaName || view.pujaId)) || "Puja").trim();
  const lang = (view && view.lang) || "";
  const now = new Date().toISOString();
  const bump = (list) => {
    const out = Array.isArray(list) ? list.slice() : [];
    const i = out.findIndex(v => (id && v.pujaId === id) || (!id && v.pujaName === title));
    let item;
    if (i >= 0) { const o = out.splice(i, 1)[0]; item = { ...o, pujaName: title || o.pujaName, lang: lang || o.lang, lastViewedAt: now, viewCount: (o.viewCount || 1) + 1 }; }
    else item = { pujaId: id, pujaName: title, lang, firstViewedAt: now, lastViewedAt: now, viewCount: 1 };
    out.unshift(item);
    return out.slice(0, 20);
  };
  const mem = sessions.get(phone) || { phone, name: name || "Devotee", loginTime: now, lastActiveAt: now, viewedPujas: [] };
  mem.lastActiveAt = now;
  if (name && name !== "Devotee") mem.name = name;
  mem.viewedPujas = bump(mem.viewedPujas);
  sessions.set(phone, mem);
  if (!db) return;
  try {
    const { data, error: e1 } = await db.from("ss_login_sessions").select("*").eq("phone", phone).maybeSingle();
    if (e1) throw e1;
    const list = bump(data && data.viewed_pujas);
    const row = { phone, name: (name && name !== "Devotee") ? name : ((data && data.name) || name || "Devotee"), last_active_at: now, viewed_pujas: list };
    if (!data) row.login_time = now;
    const { error } = await db.from("ss_login_sessions").upsert(row, { onConflict: "phone" });
    if (error) throw error;
  } catch (e) { warn("saving puja view", e); }
}

/* everyone who logged in during the last 24 hours */
async function recentSessions() {
  const since = Date.now() - DAY;
  if (db) {
    try {
      const { data, error } = await db.from("ss_login_sessions").select("*").gte("last_active_at", new Date(since).toISOString()).order("last_active_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data || []).map(r => ({ phone: r.phone, name: r.name || "Devotee", loginTime: r.login_time, lastActiveAt: r.last_active_at, viewedPujas: Array.isArray(r.viewed_pujas) ? r.viewed_pujas : [] }));
    } catch (e) { warn("reading login sessions", e); }
  }
  return [...sessions.values()].filter(s => new Date(s.lastActiveAt).getTime() >= since).map(s => ({ ...s, viewedPujas: s.viewedPujas || [] }));
}

module.exports = { saveOtp, getOtp, bumpOtpAttempts, deleteOtp, recordLoginSession, recordPujaView, recentSessions, _setClient(c) { db = c; }, _reset() { otps.clear(); sessions.clear(); } };
