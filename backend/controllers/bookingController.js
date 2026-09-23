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
  // Only update gotra on the profile if the booking includes a non-empty value.
  // If the user checked "I don't know my gotram", raw.gotram will be "" — in that
  // case we deliberately skip the gotra field so we never erase a previously saved gotram.
  const profileUpdate = { name: raw.name };
  if (raw.gotram) profileUpdate.gotra = raw.gotram;
  await userModel.updateDevotee(raw.phone, profileUpdate);

  const bookingData = {
    phone: raw.phone,
    name: raw.name,
    gotra: raw.gotram,
    price: item.price,
    source: "Website",
    notes: (raw.puja ? "Puja: " + raw.puja + "\n" : "") + "WhatsApp: " + whatsapp + "\n" + (raw.family ? "Family: " + raw.family : "")
  };

  // Pre-generate the 6-digit Booking ID and embed it into notes NOW.
  // createManualBooking would also generate one, but it only prepends it to
  // whatever notes string it receives — so without this, the WhatsApp
  // payload picks up a UUID-derived fallback instead of the real shortId.
  {
    const shortId = Math.floor(100000 + Math.random() * 900000).toString();
    bookingData.notes = "BookingID: " + shortId + "\n" + bookingData.notes;
    bookingData._shortId = shortId; // carry forward for duplicate-check response
  }

  // --- Duplicate Pending Booking Prevention ---
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("id, notes, price, status, created_at")
        .eq("devotee_phone", clean(bookingData.phone, 20))
        .eq("status", "Pending")
        .eq("price", item.price)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        const pujaTitle = raw.puja || item.name;
        const existing = data.find(b => {
          return b.notes && (
            (pujaTitle && (b.notes.includes("Puja: " + pujaTitle) || b.notes.includes(pujaTitle))) ||
            (raw.ref && b.notes.includes(raw.ref))
          );
        });
        if (existing) {
          const shortId = typeof bookingModel.getShortId === 'function' ? bookingModel.getShortId(existing.notes, existing.id) : undefined;
          return send(res, 200, { ok: true, id: existing.id, shortId, duplicate: true });
        }
      }
    } catch (e) {
      // Ignore errors and proceed to normal creation
    }
  } else if (typeof bookingModel.findPendingDuplicate === 'function') {
    try {
      const existing = await bookingModel.findPendingDuplicate({
        phone: bookingData.phone,
        price: item.price,
        puja: raw.puja || item.name,
        ref: raw.ref
      });
      if (existing) {
        return send(res, 200, { ok: true, id: existing.id, shortId: existing.shortId, duplicate: true });
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

  const shortId = booking.shortId || (typeof bookingModel.getShortId === 'function' ? bookingModel.getShortId(booking.notes, booking.id) : undefined);
  send(res, 201, { ok: true, id: booking.id, shortId });
}


// Admin Logic
async function listAll(req, res) {
  send(res, 200, await bookingModel.all());
}

async function claimPayment(req, res) {
  const body = await readBody(req);
  const bookingId = body.id || body.bookingId;
  const orderId = body.razorpay_order_id;
  if (!bookingId && !orderId) return send(res, 400, { error: "Missing booking id or order id" });

  if (typeof bookingModel.claimBooking === 'function') {
    const ok = await bookingModel.claimBooking(bookingId, orderId);
    if (!ok) return send(res, 400, { error: "Payment not verified or booking not found" });
    return send(res, 200, { ok: true, success: true });
  }

  const { supabase } = require("../utils/supabase");
  if (!supabase) return send(res, 400, { error: "Payments require database" });

  let query = supabase.from("bookings").update({
    status: "Pending Verification",
    payment_status: "Pending Verification"
  });
  if (bookingId) {
    query = query.eq("id", bookingId);
  } else {
    query = query.ilike("notes", `%razorpay_order:${orderId}%`);
  }
  const { data, error } = await query.select();

  if (error || !data || !data.length) return send(res, 400, { error: "Payment not verified or booking not found" });
  send(res, 200, { ok: true, success: true });
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
  if (raw.pujaId && (!raw.notes || !raw.notes.includes("Puja:"))) {
    const catalog = require("../utils/catalog");
    const item = catalog.resolveItem(raw.pujaId, raw.puja);
    const pujaTitle = item ? item.name : raw.pujaId;
    raw.notes = `Puja: ${pujaTitle}\n${raw.notes || ""}`.trim();
  } else if (raw.puja && (!raw.notes || !raw.notes.includes("Puja:"))) {
    raw.notes = `Puja: ${raw.puja}\n${raw.notes || ""}`.trim();
  }
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

async function adminCompleteBooking(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "Missing booking id" });
  const ok = await bookingModel.updateBooking(id, { status: "Completed" });
  if (!ok) return send(res, 500, { error: "Failed to complete booking" });
  send(res, 200, { ok: true, status: "Completed" });
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
  const token = url.searchParams.get("token");
  if (!id || !token) {
    res.writeHead(302, { Location: "/login.html" });
    return res.end();
  }

  const b = await bookingModel.findById(id);
  if (!b) {
    res.writeHead(302, { Location: "/login.html" });
    return res.end();
  }

  const crypto = require("crypto");
  const secret = process.env.JWT_SECRET || "shubha_recovery_secret";
  const expectedToken = crypto.createHmac("sha256", secret).update(`${b.id}|${b.userPhone || b.devotee_phone}`).digest("hex");
  
  if (token !== expectedToken) {
    res.writeHead(302, { Location: "/login.html" });
    return res.end();
  }

  // Determine ref for payment page
  let ref = "puja:0";
  const catalog = require("../utils/catalog");
  const item = catalog.resolveItem(b.puja_id || null, b.puja);
  if (item && item.ref) ref = item.ref;
  else if (item && item.id) ref = item.type === "package" ? `pkg:${item.id}` : `puja:${item.id}`;

  // Log user in automatically
  const userModel = require("../models/userModel");
  const { createSession } = require("../middleware/auth");
  let user = await userModel.findByPhone(b.userPhone || b.devotee_phone);
  if (!user) {
    user = await userModel.findOrCreate(b.userPhone || b.devotee_phone, { name: b.name });
  }
  const sessionToken = createSession(user.phone);

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Recovering Booking...</title></head>
      <body>
        <script>
          localStorage.setItem("token", "${sessionToken}");
          window.location.replace("/payment.html?id=${ref}&bookingId=${id}");
        </script>
      </body>
    </html>
  `);
}

module.exports = {
  create, claimPayment, listAll, adminCreateBooking, updateVideo, adminUpdateBooking, adminCompleteBooking, adminDeleteBooking, deleteMyBooking, recoverBooking
};
