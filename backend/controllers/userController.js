/* ============================================================
   USER CONTROLLER — profile: read and update "me", admin APIs
   ============================================================ */
const { send, readBody, clean } = require("../utils/http");
const userModel = require("../models/userModel");
const bookingModel = require("../models/bookingModel");

async function getMe(req, res) {
  const p = req.userPhone;
  const user = await userModel.findOrCreate(p);
  const bookings = await bookingModel.getUserBookings(p);
  send(res, 200, { user, bookings });
}

async function updateMe(req, res) {
  const p = req.userPhone;
  const body = await readBody(req);
  const updated = await userModel.updateDevotee(p, body);
  send(res, 200, { ok: true, user: updated });
}

// Admin Logic
async function adminListDevotees(req, res) {
  const devotees = await userModel.all();
  send(res, 200, devotees);
}

async function adminCreateDevotee(req, res) {
  const body = await readBody(req);
  const devotee = await userModel.createManualDevotee(body);
  if (!devotee) return send(res, 400, { error: "Name and Phone are required." });
  send(res, 201, { ok: true, devotee });
}

async function adminUpdateDevotee(req, res, url) {
  const phone = url.searchParams.get("phone");
  if (!phone) return send(res, 400, { error: "Missing phone parameter" });
  const body = await readBody(req);
  const updated = await userModel.updateDevotee(phone, body);
  if (!updated) return send(res, 400, { error: "Failed to update devotee" });
  send(res, 200, { ok: true, devotee: updated });
}

async function adminDeleteDevotee(req, res, url) {
  const phone = url.searchParams.get("phone");
  if (!phone) return send(res, 400, { error: "Missing phone parameter" });
  const success = await userModel.deleteDevotee(phone);
  if (!success) return send(res, 500, { error: "Failed to delete devotee" });
  send(res, 200, { ok: true });
}

module.exports = { getMe, updateMe, adminListDevotees, adminCreateDevotee, adminUpdateDevotee, adminDeleteDevotee };
