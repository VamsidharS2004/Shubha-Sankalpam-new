const crypto = require("crypto");
const { send, readBody } = require("../utils/http");
const { ADMIN_PASSWORD } = require("../config");

const adminSessions = new Map(); // hash -> { expires }

// IP -> { count, windowStart }
const rateLimits = new Map();

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || "0.0.0.0";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  let record = rateLimits.get(ip);
  if (!record || now - record.windowStart > windowMs) {
    record = { count: 0, windowStart: now };
    rateLimits.set(ip, record);
  }
  if (record.count >= 5) {
    return false;
  }
  return true;
}

function incrementRateLimit(ip) {
  const record = rateLimits.get(ip);
  if (record) record.count++;
}

async function login(req, res) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return send(res, 429, { error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const body = await readBody(req);
  const submittedPassword = body.password || "";

  // safely compare strings of potentially different lengths
  const expected = Buffer.from(ADMIN_PASSWORD, "utf8");
  const actual = Buffer.from(submittedPassword, "utf8");
  let valid = false;

  if (expected.length === actual.length) {
    valid = crypto.timingSafeEqual(expected, actual);
  } else {
    // dummy check to avoid timing attacks based on length
    crypto.timingSafeEqual(expected, expected);
  }

  if (!valid) {
    incrementRateLimit(ip);
    return send(res, 401, { error: "Invalid admin password." });
  }

  // Create session
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  
  const maxAgeSeconds = 7 * 24 * 60 * 60; // 1 week
  adminSessions.set(hashedToken, {
    expires: Date.now() + (maxAgeSeconds * 1000)
  });

  // Cleanup old sessions
  const now = Date.now();
  for (const [key, val] of adminSessions.entries()) {
    if (val.expires < now) adminSessions.delete(key);
  }

  // Use secure cookies unless explicitly allowed
  const isProd = process.env.NODE_ENV === "production" || !process.env.ALLOW_HTTP_COOKIE;
  const secure = isProd ? "Secure;" : "";
  const cookie = `admin_session=${rawToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}; ${secure}`;
  
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": cookie
  });
  res.end(JSON.stringify({ ok: true }));
}

async function logout(req, res) {
  // Parse cookie to get token manually if middleware didn't run
  let token = req.adminToken || "";
  if (!token) {
    const rc = req.headers.cookie;
    if (rc) {
      rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.shift().trim() === 'admin_session') {
          token = decodeURI(parts.join('='));
        }
      });
    }
  }

  if (token) {
    adminSessions.delete(hashToken(token));
  }
  const cookie = `admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": cookie
  });
  res.end(JSON.stringify({ ok: true }));
}

async function sessionCheck(req, res) {
  // requires adminOnly middleware first
  return send(res, 200, { ok: true });
}

// Exported for middleware usage
function isValidAdminSession(rawToken) {
  if (!rawToken) return false;
  const hashed = hashToken(rawToken);
  const session = adminSessions.get(hashed);
  if (!session) return false;
  if (Date.now() > session.expires) {
    adminSessions.delete(hashed);
    return false;
  }
  return true;
}

module.exports = { login, logout, sessionCheck, isValidAdminSession, hashToken };
