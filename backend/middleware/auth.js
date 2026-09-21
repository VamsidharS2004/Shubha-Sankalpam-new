/* ============================================================
   AUTH MIDDLEWARE — runs BEFORE controllers to check identity.
   - sessions: token → phone (in memory; logins reset on restart)
   - requireLogin: blocks the request if no valid token
   - optionalLogin: attaches the user if logged in, never blocks
   - adminOnly: blocks unless the admin password is given
   ============================================================ */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { send } = require("../utils/http");
const { ADMIN_PASSWORD } = require("../config");

const SESSIONS_FILE = path.join(__dirname, "..", "..", "data", "sessions.json");
let sessions = new Map(); // token -> phone

// Load sessions from disk on startup
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const data = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(data);
    sessions = new Map(Object.entries(parsed));
  }
} catch (e) {
  console.error("Error loading sessions from disk:", e);
}

function saveSessions() {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const obj = Object.fromEntries(sessions);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving sessions to disk:", e);
  }
}

function createSession(phone) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, phone);
  saveSessions();
  return token;
}

function registerSession(token, phone) {
  if (token && phone) {
    sessions.set(token, phone);
    saveSessions();
  }
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
