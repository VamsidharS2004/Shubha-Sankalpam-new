/* ============================================================
   AUTH MIDDLEWARE — runs BEFORE controllers to check identity.
   - sessions: token → phone (in memory; logins reset on restart)
   - requireLogin: blocks the request if no valid token
   - optionalLogin: attaches the user if logged in, never blocks
   - adminOnly: blocks unless the admin password is given
   ============================================================ */
const crypto = require("crypto");
const { send } = require("../utils/http");
const { ADMIN_PASSWORD } = require("../config");

const sessions = new Map(); // token -> phone

function createSession(phone) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, phone);
  return token;
}

function registerSession(token, phone) {
  if (token && phone) sessions.set(token, phone);
}

function phoneFromRequest(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return token ? sessions.get(token) || null : null;
}

/* middleware return true = continue, false = already responded */
function requireLogin(req, res) {
  const phone = phoneFromRequest(req);
  if (!phone) { send(res, 401, { error: "Please log in." }); return false; }
  req.userPhone = phone;
  return true;
}

function optionalLogin(req) {
  req.userPhone = phoneFromRequest(req);
  return true;
}

function adminOnly(req, res, url) {
  const key = url.searchParams.get("key");
  if (key !== ADMIN_PASSWORD) {
    send(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

module.exports = { createSession, registerSession, requireLogin, optionalLogin, adminOnly };
