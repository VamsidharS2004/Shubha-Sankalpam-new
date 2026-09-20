/* ================================================================
   BOOKING CONTROLLER — create bookings, list all (admin)
   ================================================================ */
const { send, readBody, clean } = require("../utils/http");
const { supabase } = require("../utils/supabase");
const bookingModel = require("../models/bookingModel");

const userModel = require("../models/userModel");

// ... Existing frontend booking creation (simplified) ...
async function create(req, res) {
  const raw = await readBody(req);
  if (!raw.phone || !raw.name) {
    return send(res, 400, { error: "Name and phone number are required." });
  }

  const item = require('../utils/catalog').resolveItem(raw.ref, raw.puja);
  if (!item) return send(res,400,{error:'Please choose a valid puja.'});
  if (Number(raw.price) !== item.price) return send(res,409,{error:'The price has changed. Refresh the booking page before continuing.',price:item.price});
  const whatsapp = String(raw.phone || '').replace(/\D/g,'').slice(-10);
  if (!/^[6-9]\d{9}$/.test(whatsapp)) return send(res,400,{error:'Please enter a valid WhatsApp number.'});
  raw.phone = req.userPhone;
  raw.puja = item.name;
  raw.price = item.price;
  // Ensure devotee exists and update their details with the latest info
  await userModel.findOrCreate(raw.phone, { name: raw.name });
  await userModel.updateDevotee(raw.phone, { name: raw.name, gotra: raw.gotram });

  const bookingData = {
    phone: raw.phone,
    name: raw.name,
    gotra: raw.gotram,
    price: item.price,
    source: "Website",
    notes: (raw.puja ? "Puja: " + raw.puja + "\n" : "") + "WhatsApp: " + whatsapp + "\n" + (raw.family ? "Family: " + raw.family : "")
  };

  // --- Duplicate Pending Booking Prevention ---
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("devotee_phone", clean(bookingData.phone, 20))
        .eq("status", "Pending")
        .eq("price", item.price)
        .eq("notes", clean(bookingData.notes, 500))
        .limit(1);

      if (data && data.length > 0) {
        return send(res, 201, { id: data[0].id });
      }
    } catch (e) {
      // Ignore errors and proceed to normal creation
    }
  }
  // --- End Duplicate Prevention ---

  const booking = await bookingModel.createManualBooking(bookingData);
  
  if (!booking) {
    return send(res, 400, { error: "Failed to create booking." });
  }

  send(res, 201, { id: booking.id });
}


// Admin Logic
async function listAll(req, res) {
  send(res, 200, await bookingModel.all());
}

async function claimPayment(req, res) {
  // Same logic as before...
  const body = await readBody(req);
  if (!body.razorpay_order_id) return send(res, 400, { error: "Missing order id" });

  const { supabase } = require("../utils/supabase");
  if (!supabase) return send(res, 400, { error: "Payments require database" });

  const { data, error } = await supabase.from("bookings")
    .update({ payment_status: "Paid" })
    .eq("notes", `razorpay_order:${body.razorpay_order_id}`)
    .select();

  if (error || !data.length) return send(res, 400, { error: "Payment not verified" });
  send(res, 200, { success: true });
}

async function updateVideo(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });
  
  const body = await readBody(req);
  if (!body.videoUrl) return send(res, 400, { error: "Missing video URL" });

  const ok = await bookingModel.updateBookingVideo(id, body.videoUrl);
  if (!ok) return send(res, 500, { error: "Failed to update video URL" });
  send(res, 200, { success: true });
}

async function adminCreateBooking(req, res) {
  const raw = await readBody(req);
  const booking = await bookingModel.createManualBooking(raw);
  
  if (!booking) return send(res, 400, { error: "Failed to create booking. Name, phone, and price are required." });
  
  send(res, 201, { ok: true, booking });
}
async function adminUpdateBooking(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });
  const body = await readBody(req);
  const ok = await bookingModel.updateBooking(id, body);
  if (!ok) return send(res, 500, { error: "Failed to update booking" });
  send(res, 200, { ok: true });
}

async function adminDeleteBooking(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });
  const ok = await bookingModel.deleteBooking(id);
  if (!ok) return send(res, 500, { error: "Failed to delete booking" });
  send(res, 200, { ok: true });
}

async function deleteMyBooking(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });
  if (!req.userPhone) return send(res, 401, { error: "Unauthorized" });

  const b = await bookingModel.findById(id);
  if (!b) return send(res, 404, { error: "Not found" });
  if (b.userPhone !== req.userPhone && b.devotee_phone !== req.userPhone) return send(res, 403, { error: "Forbidden" });

  const ok = await bookingModel.deleteBooking(id);
  if (!ok) return send(res, 500, { error: "Failed to delete booking" });
  send(res, 200, { ok: true });
}

async function recoverBooking(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });

  const b = await bookingModel.findById(id);
  if (!b) return send(res, 404, { error: "Not found" });
  
  send(res, 200, b);
}

module.exports = {
  create, claimPayment, listAll, adminCreateBooking, updateVideo, adminUpdateBooking, adminDeleteBooking, deleteMyBooking, recoverBooking
};
