/* ================================================================
   BOOKING MODEL — Supabase implementation with automatic
   local-JSON-file fallback when Supabase isn't configured
   (SUPABASE_URL / SUPABASE_SERVICE_KEY left blank in config.js).
   ================================================================ */
const fs   = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabase");
const { clean }    = require("../utils/http");

/* ----------------------------------------------------------------
   LOCAL JSON FILE STORE — only used when supabase is not configured.
   Lives at backend/bookings.json
   ---------------------------------------------------------------- */
const DATA_FILE = path.join(__dirname, "..", "bookings.json");

function readLocalBookings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function writeLocalBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

/* ----------------------------------------------------------------
   LOCAL HELPERS
   ---------------------------------------------------------------- */
function localCreate(raw) {
  const bookings = readLocalBookings();
  const id = "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const record = {
    id,
    devotee_phone  : clean(raw.phone, 20)     || null,
    price          : Number(raw.price)         || 0,
    status         : raw.status                || "Pending",
    payment_status : raw.payment_status        || "Pending",
    source         : raw.source                || "Manual",
    notes          : clean(raw.notes, 500)     || null,
    name           : clean(raw.name, 100)      || null,
    gotra          : clean(raw.gotra, 100)     || null,
    created_at     : new Date().toISOString()
  };
  bookings.push(record);
  writeLocalBookings(bookings);
  return record;
}

/* ================================================================
   PUBLIC API
   ================================================================ */

async function createManualBooking(raw) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    return localCreate(raw);
  }

  /* ---- Supabase ---- */
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .insert([{
      devotee_phone  : clean(raw.phone, 20),
      puja_id        : raw.pujaId        || null,
      price          : Number(raw.price) || 0,
      status         : raw.status        || "Pending",
      payment_status : raw.payment_status || "Pending",
      notes          : clean(raw.notes, 500)
    }])
    .select()
    .single();

  if (bErr) {
    console.error("Error creating booking:", bErr);
    return null;
  }

  if (raw.name) {
    await supabase.from("booking_names").insert([{
      booking_id : booking.id,
      name       : clean(raw.name, 100),
      gotra      : clean(raw.gotra, 100)
    }]);
  }

  return booking;
}

async function all() {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    return readLocalBookings().map(b => ({
      id        : b.id,
      price     : b.price,
      status    : b.status,
      createdAt : b.created_at,
      videoUrl  : b.video_url  || null,
      name      : b.name       || "Unknown",
      phone     : b.devotee_phone || "",
      puja      : b.notes ? b.notes.replace(/^Puja: /, "").split("\n")[0] : "Unknown Puja"
    }));
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, price, status, created_at,
      devotees ( name, phone ),
      pujas ( title_en ),
      booking_names ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) { console.error("Error fetching bookings:", error); return []; }

  return data.map(b => ({
    id        : b.id,
    price     : b.price,
    status    : b.status,
    createdAt : b.created_at,
    videoUrl  : null,
    name      : b.booking_names?.length > 0 ? b.booking_names[0].name : (b.devotees?.name || "Unknown"),
    phone     : b.devotees?.phone || "",
    puja      : b.pujas?.title_en || "Unknown Puja"
  }));
}

async function getUserBookings(phone) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const p = clean(phone, 20);
    return readLocalBookings()
      .filter(b => b.devotee_phone === p)
      .map(b => ({
        id        : b.id,
        price     : b.price,
        status    : b.status,
        createdAt : b.created_at,
        videoUrl  : b.video_url || null,
        name      : b.name || "Unknown",
        phone     : b.devotee_phone || "",
        puja      : b.notes ? b.notes.replace(/^Puja: /, "").split("\n")[0] : "Unknown Puja"
      }));
  }

  /* ---- Supabase ---- */
  const p = clean(phone, 20);
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, price, status, created_at,
      devotees!inner ( phone ),
      pujas ( title_en ),
      booking_names ( name )
    `)
    .eq("devotee_phone", p)
    .order("created_at", { ascending: false });

  if (error) { console.error("Error fetching user bookings:", error); return []; }

  return data.map(b => ({
    id        : b.id,
    price     : b.price,
    status    : b.status,
    createdAt : b.created_at,
    videoUrl  : null,
    name      : b.booking_names?.length > 0 ? b.booking_names[0].name : (b.devotees?.name || "Unknown"),
    phone     : b.devotees?.phone || "",
    puja      : b.pujas?.title_en || "Unknown Puja"
  }));
}

async function updateBookingVideo(bookingId, videoUrl) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) return false;
    bookings[idx].video_url = clean(videoUrl, 1000);
    bookings[idx].status    = "video-sent";
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const { error } = await supabase
    .from("bookings")
    .update({ video_url: clean(videoUrl, 1000), status: "video-sent" })
    .eq("id", bookingId);

  if (error) { console.error("Error updating booking video:", error); return false; }
  return true;
}

async function updateBooking(id, data) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    if (data.status)          bookings[idx].status         = clean(data.status, 50);
    if (data.payment_status)  bookings[idx].payment_status = clean(data.payment_status, 50);
    if (data.price !== undefined) bookings[idx].price      = Number(data.price) || 0;
    if (data.notes !== undefined) bookings[idx].notes      = clean(data.notes, 500);
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const updateData = {};
  if (data.status)          updateData.status         = clean(data.status, 50);
  if (data.payment_status)  updateData.payment_status = clean(data.payment_status, 50);
  if (data.price !== undefined) updateData.price      = Number(data.price) || 0;
  if (data.notes !== undefined) updateData.notes      = clean(data.notes, 500);

  const { error } = await supabase.from("bookings").update(updateData).eq("id", id);
  if (error) { console.error("Error updating booking:", error); return false; }
  return true;
}

async function deleteBooking(id) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    writeLocalBookings(bookings.filter(b => b.id !== id));
    return true;
  }

  /* ---- Supabase ---- */
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) { console.error("Error deleting booking:", error); return false; }
  return true;
}

async function findById(id) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const b = readLocalBookings().find(b => b.id === id);
    if (!b) return null;
    return { id: b.id, price: b.price, userPhone: b.devotee_phone };
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
  if (error) return null;
  return { id: data.id, price: data.price, userPhone: data.devotee_phone };
}

async function attachOrder(id, orderId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].notes = `razorpay_order:${orderId}`;
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const { error } = await supabase.from("bookings").update({ notes: `razorpay_order:${orderId}` }).eq("id", id);
  return !error;
}

async function findByOrderId(orderId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const b = readLocalBookings().find(b => b.notes === `razorpay_order:${orderId}`);
    if (!b) return null;
    return { id: b.id, price: b.price };
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase.from("bookings").select("*").eq("notes", `razorpay_order:${orderId}`).single();
  if (error) return null;
  return { id: data.id, price: data.price };
}

async function markPaid(id, paymentId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].payment_status = "Paid";
    bookings[idx].status         = "Confirmed";
    bookings[idx].notes          = `razorpay_payment:${paymentId}`;
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const { error } = await supabase.from("bookings").update({
    payment_status : "Paid",
    status         : "Confirmed",
    notes          : `razorpay_payment:${paymentId}`
  }).eq("id", id);
  return !error;
}

async function setStatus(id, status) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].status = status;
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  return !error;
}

module.exports = {
  createManualBooking,
  all, getUserBookings,
  updateBookingVideo, updateBooking, deleteBooking,
  findById, attachOrder, findByOrderId, markPaid, setStatus
};
