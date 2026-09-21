/* ============================================================
   ANALYTICS MODEL — Dual-layer storage for active user tracking.
   - Layer 1: In-memory Map (activeSessions) for fast access
   - Layer 2: Disk persistence to data/analytics.json
   - Features:
     * 500ms debounced atomic writes (.tmp + rename)
     * Process exit / shutdown hooks (SIGINT, SIGTERM, exit)
     * Session rehydration into auth.js on boot (24-hour TTL)
     * Auto-pruning of stale sessions (> 24h)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { normalizePhone } = require("../utils/http");
const { registerSession } = require("../middleware/auth");

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory Map: phone -> session
const activeSessions = new Map();

let saveTimer = null;
let initialized = false;
let shutdownRegistered = false;

/* Ensure data directory exists */
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ANALYTICS_FILE)) {
      fs.writeFileSync(ANALYTICS_FILE, "[]", "utf8");
    }
  } catch (err) {
    console.error("⚠️ [Analytics] Could not initialize data directory or analytics.json:", err.message);
  }
}

/* Helper to find active session matching either exact normalized phone or trailing 10 digits */
function findSession(phone) {
  const p = normalizePhone(phone);
  if (!p) return null;
  if (activeSessions.has(p)) return activeSessions.get(p);
  const digits10 = p.replace(/\D/g, "").slice(-10);
  if (digits10.length === 10) {
    for (const [key, session] of activeSessions.entries()) {
      if (key.replace(/\D/g, "").slice(-10) === digits10) {
        return session;
      }
    }
  }
  return null;
}

/* Atomic flush to data/analytics.json */
function flushSync() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  ensureDataDir();
  pruneInactive(SESSION_TTL_MS);

  const sessionsArray = Array.from(activeSessions.values());
  const tempFile = path.join(DATA_DIR, `analytics.tmp.${process.pid}.${Date.now()}`);

  try {
    fs.writeFileSync(tempFile, JSON.stringify(sessionsArray, null, 2), "utf8");
    try {
      fs.renameSync(tempFile, ANALYTICS_FILE);
    } catch (renameErr) {
      // Windows file locking fallback
      if (fs.existsSync(ANALYTICS_FILE)) {
        try { fs.unlinkSync(ANALYTICS_FILE); } catch (_) {}
      }
      try {
        fs.renameSync(tempFile, ANALYTICS_FILE);
      } catch (_) {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(sessionsArray, null, 2), "utf8");
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }
    }
  } catch (err) {
    console.error("⚠️ [Analytics] Failed to persist analytics.json:", err.message);
  }
}

/* Debounced save (500ms) */
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushSync();
  }, 500);
  if (saveTimer && typeof saveTimer.unref === "function") {
    saveTimer.unref();
  }
}

/* Prune sessions inactive for longer than TTL */
function pruneInactive(ttl = SESSION_TTL_MS) {
  const now = Date.now();
  for (const [phone, session] of activeSessions.entries()) {
    const lastActive = session.lastActiveAt || session.loginTime;
    const age = now - (lastActive ? new Date(lastActive).getTime() : 0);
    if (age > ttl) {
      activeSessions.delete(phone);
    }
  }
}

/* Register process shutdown handlers to guarantee flush */
function registerShutdown() {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  const handleShutdown = () => {
    try { flushSync(); } catch (_) {}
  };

  process.on("exit", handleShutdown);
  process.on("SIGINT", () => {
    handleShutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    handleShutdown();
    process.exit(0);
  });
}

/* Initialize analytics model: rehydrate sessions from disk */
function init() {
  if (initialized) return;
  initialized = true;

  ensureDataDir();
  registerShutdown();

  if (!fs.existsSync(ANALYTICS_FILE)) return;

  try {
    const raw = fs.readFileSync(ANALYTICS_FILE, "utf8");
    const data = JSON.parse(raw || "[]");
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data?.sessions)) {
      list = data.sessions;
    } else if (Array.isArray(data?.activeUsers)) {
      list = data.activeUsers;
    } else if (Array.isArray(data?.users)) {
      list = data.users;
    } else if (data?.activeSessions) {
      list = Array.isArray(data.activeSessions) ? data.activeSessions : Object.values(data.activeSessions);
    } else if (data && typeof data === "object") {
      list = Object.values(data).filter(item => item && typeof item === "object" && item.phone);
    }
    const now = Date.now();

    for (const s of list) {
      if (!s || !s.phone) continue;
      const lastActive = s.lastActiveAt || s.loginTime;
      const age = now - (lastActive ? new Date(lastActive).getTime() : 0);
      if (age <= SESSION_TTL_MS) {
        activeSessions.set(s.phone, s);
        // Rehydrate session token into auth middleware so users stay logged in
        if (s.token && typeof registerSession === "function") {
          registerSession(s.token, s.phone);
        }
      }
    }
  } catch (err) {
    console.error("⚠️ [Analytics] Failed to rehydrate analytics sessions:", err.message);
  }
}

/* Record user login */
function recordLogin(phone, name, token) {
  if (!initialized) init();
  const p = normalizePhone(phone);
  if (!p) return;

  const now = new Date().toISOString();
  let session = findSession(p);

  if (session) {
    session.token = token || session.token;
    if (name && name !== "Devotee") {
      session.name = name;
    } else if (!session.name) {
      session.name = name || "Devotee";
    }
    session.loginTime = now;
    session.lastActiveAt = now;
    if (!Array.isArray(session.viewedPujas)) {
      session.viewedPujas = [];
    }
    if (!activeSessions.has(p)) {
      activeSessions.set(p, session);
    }
  } else {
    session = {
      phone: p,
      name: name || "Devotee",
      token: token || null,
      loginTime: now,
      lastActiveAt: now,
      viewedPujas: []
    };
    activeSessions.set(p, session);
  }

  scheduleSave();
  return session;
}

/* Record a viewed puja for a user */
function recordPujaView(phone, name, { pujaId, pujaName, lang } = {}) {
  if (!initialized) init();
  const p = normalizePhone(phone);
  if (!p) return;

  const now = new Date().toISOString();
  let session = activeSessions.get(p);

  if (!session) {
    session = {
      phone: p,
      name: name || "Devotee",
      token: null,
      loginTime: now,
      lastActiveAt: now,
      viewedPujas: []
    };
    activeSessions.set(p, session);
  }

  session.lastActiveAt = now;
  if (name && name !== "Devotee" && session.name === "Devotee") {
    session.name = name;
  }

  if (!Array.isArray(session.viewedPujas)) {
    session.viewedPujas = [];
  }

  const id = String(pujaId || "").trim();
  const title = String(pujaName || id || "Puja").trim();

  const existing = session.viewedPujas.find(
    v => (id && v.pujaId === id) || (!id && v.pujaName === title)
  );

  if (existing) {
    existing.viewCount = (existing.viewCount || 1) + 1;
    existing.lastViewedAt = now;
    if (lang) existing.lang = lang;
    if (title && (!existing.pujaName || existing.pujaName === id)) {
      existing.pujaName = title;
    }
  } else {
    session.viewedPujas.push({
      pujaId: id,
      pujaName: title,
      lang: lang || "",
      firstViewedAt: now,
      lastViewedAt: now,
      viewCount: 1
    });
  }

  scheduleSave();
  return session;
}

/* Update devotee's name */
function updateUserName(phone, name) {
  if (!initialized) init();
  const p = normalizePhone(phone);
  if (!p || !name) return;

  const session = findSession(p);
  if (session) {
    session.name = name;
    session.lastActiveAt = new Date().toISOString();
    scheduleSave();
  }
}

/* Get all active users and stats */
function getActiveUsers() {
  if (!initialized) init();
  pruneInactive(SESSION_TTL_MS);

  const users = Array.from(activeSessions.values()).sort((a, b) => {
    const timeA = new Date(a.lastActiveAt || a.loginTime || 0).getTime();
    const timeB = new Date(b.lastActiveAt || b.loginTime || 0).getTime();
    return timeB - timeA;
  });

  const totalViews = users.reduce((acc, u) => {
    return acc + (u.viewedPujas || []).reduce((sum, v) => sum + (v.viewCount || 1), 0);
  }, 0);

  return {
    ok: true,
    activeCount: users.length,
    totalActive: users.length,
    totalViews,
    users,
    activeUsers: users
  };
}

module.exports = {
  init,
  flushSync,
  scheduleSave,
  pruneInactive,
  recordLogin,
  recordPujaView,
  updateUserName,
  getActiveUsers,
  getAllSessions: () => Array.from(activeSessions.values()),
  _activeSessionsMap: activeSessions
};
