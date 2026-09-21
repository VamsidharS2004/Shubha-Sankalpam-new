/* ============================================================
   USER CONTROLLER — profile: read and update "me", admin APIs
   ============================================================ */
const { send, readBody, clean } = require("../utils/http");
const userModel = require("../models/userModel");
const bookingModel = require("../models/bookingModel");
const analyticsModel = require("../models/analyticsModel");

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
  if (updated && updated.name) {
    analyticsModel.updateUserName(p, updated.name);
  }
  send(res, 200, { ok: true, user: updated });
}

// Admin Logic
async function adminListDevotees(req, res) {
  const devotees = await userModel.all();
  const bookings = await bookingModel.all();
  let leads=[], trackingError=null;
  try { leads=await require('../models/leadModel').all(); } catch(e) { trackingError=e.message; }
  const digits=p=>String(p||'').replace(/\D/g,'').slice(-10);
  send(res, 200, devotees.map(d=>{
    const related=bookings.filter(b=>digits(b.phone)===digits(d.phone));
    const lead=leads.find(l=>digits(l.phone)===digits(d.phone))||{};
    return {...d,...lead,tracking_error:trackingError,booking_count:related.length,
      pending_count:related.filter(b=>['pending','failed','payment-pending'].includes(String(b.status).toLowerCase())).length,
      confirmed_count:related.filter(b=>['confirmed','scheduled','video delivered','paid','video-sent'].includes(String(b.status).toLowerCase())).length};
  }));
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

async function trackInterest(req,res){
  const {ref}=await readBody(req);
  if(!require('../utils/catalog').resolveItem(String(ref||''))) return send(res,400,{error:'Unknown puja'});
  const ok=await require('../models/leadModel').interest(req.userPhone,String(ref||''));
  send(res,ok?200:503,ok?{ok:true}:{error:'Interest tracking is temporarily unavailable.'});
}
async function catalogItem(req,res,url){
  const item=require('../utils/catalog').resolveItem(url.searchParams.get('ref'));
  send(res,item?200:404,item?{item}:{error:'Puja unavailable. Please choose a puja again.'});
}
module.exports = { trackInterest, catalogItem, getMe, updateMe, adminListDevotees, adminCreateDevotee, adminUpdateDevotee, adminDeleteDevotee };
