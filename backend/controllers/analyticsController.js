/* ============================================================
   ANALYTICS CONTROLLER — user activity & active session tracking
   ============================================================ */
const { send, readBody } = require("../utils/http");
const userModel = require("../models/userModel");
const analyticsModel = require("../models/analyticsModel");

/* POST /api/analytics/view
   Called by logged-in users when viewing puja details */
async function recordView(req, res) {
  try {
    const body = await readBody(req);
    const pujaId = body.pujaId || body.ref || "";
    const pujaName = body.pujaName || body.title || "";
    const lang = body.lang || "";

    const devotee = await userModel.findOrCreate(req.userPhone);
    const devoteeName = (devotee && devotee.name) ? devotee.name : "Devotee";

    analyticsModel.recordPujaView(req.userPhone, devoteeName, { pujaId, pujaName, lang });
    /* also keep it in the database so the admin dashboard sees it whichever server copy answers */
    await require("../models/loginStateModel").recordPujaView(req.userPhone, devoteeName, { pujaId, pujaName, lang });
    send(res, 200, { ok: true });
  } catch (err) {
    send(res, 400, { error: err.message || "Failed to record puja view" });
  }
}

/* GET /api/admin/analytics/active-users
   GET /api/admin/analytics
   Returns active user sessions, login times, and viewed pujas */
async function getActiveUsers(req, res) {
  try {
    const data = analyticsModel.getActiveUsers();
    /* add everyone who logged in during the last 24 hours (stored in Supabase; this server copy may not have seen them) */
    const shared = await require("../models/loginStateModel").recentSessions();
    const keyOf = p => String(p || "").replace(/\D/g, "").slice(-10);
    const byKey = new Map((data.users || []).map(u => [keyOf(u.phone), u]));
    const mergeViews = (a, b) => {
      const map = new Map();
      [...(a || []), ...(b || [])].forEach(v => {
        const k = v.pujaId || v.pujaName;
        const o = map.get(k);
        if (!o || new Date(v.lastViewedAt || 0) > new Date(o.lastViewedAt || 0)) map.set(k, { ...(o || {}), ...v, viewCount: Math.max(v.viewCount || 1, (o && o.viewCount) || 1) });
      });
      return [...map.values()].sort((x, y) => new Date(y.lastViewedAt || 0) - new Date(x.lastViewedAt || 0));
    };
    for (const s of shared) {
      const key = keyOf(s.phone);
      if (!key) continue;
      const local = byKey.get(key);
      if (!local) { data.users.push(s); data.activeUsers.push(s); byKey.set(key, s); continue; }
      local.viewedPujas = mergeViews(local.viewedPujas, s.viewedPujas);
      if ((!local.name || local.name === "Devotee") && s.name && s.name !== "Devotee") local.name = s.name;
      if (new Date(s.lastActiveAt || 0) > new Date(local.lastActiveAt || 0)) local.lastActiveAt = s.lastActiveAt;
    }
    data.users.sort((a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0));
    data.activeCount = data.totalActive = data.users.length;
    send(res, 200, data);
  } catch (err) {
    send(res, 500, { error: err.message || "Failed to retrieve active users" });
  }
}

module.exports = { recordView, getActiveUsers };
