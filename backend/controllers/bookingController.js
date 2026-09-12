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

  // Ensure devotee exists and update their details with the latest info
  await userModel.findOrCreate(raw.phone, { name: raw.name });
  await userModel.updateDevotee(raw.phone, { name: raw.name, gotra: raw.gotram });

  const bookingData = {
    phone: raw.phone,
    name: raw.name,
    gotra: raw.gotram,
    price: raw.price,
    notes: (raw.puja ? "Puja: " + raw.puja + "\n" : "") + (raw.family ? "Family: " + raw.family : "")
  };

  // --- Duplicate Pending Booking Prevention ---
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("devotee_phone", clean(bookingData.phone, 20))
        .eq("status", "Pending")
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

module.exports = {
  create, claimPayment, listAll, adminCreateBooking, updateVideo, adminUpdateBooking, adminDeleteBooking
};
