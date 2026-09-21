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

// Use the admin password as a stable secret key to sign tokens so they survive server restarts
const SECRET = crypto.createHash("sha256").update(ADMIN_PASSWORD + "_ss_auth_v1").digest("hex");

function createSession(phone) {
  // Create a completely stateless token: base64url(phone) + "." + hmac(phone)
  const data = Buffer.from(String(phone)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function registerSession(token, phone) {
  // Not needed for stateless, but keeping signature for backwards compatibility with authController
}

function phoneFromRequest(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.includes(".")) return null;
  
  try {
    const [data, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    
    // Validate signature securely
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return Buffer.from(data, "base64url").toString("utf8");
    }
  } catch (e) {
    return null;
  }
  return null;
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
