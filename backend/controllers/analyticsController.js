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
    send(res, 200, data);
  } catch (err) {
    send(res, 500, { error: err.message || "Failed to retrieve active users" });
  }
}

module.exports = { recordView, getActiveUsers };
