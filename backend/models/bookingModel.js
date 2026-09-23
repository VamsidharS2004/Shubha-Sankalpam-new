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

async function generateUniqueBookingId() {
  if (!supabase) return Math.floor(100000 + Math.random() * 900000).toString();
  while (true) {
    const shortId = Math.floor(100000 + Math.random() * 900000).toString();
    const { data } = await supabase.from("bookings").select("id").ilike("notes", "%BookingID: " + shortId + "%").limit(1);
    if (!data || data.length === 0) return shortId;
  }
}

function getSnapshot(notes) {
  const m = String(notes || "").match(/Snapshot:\s*(\{.*\})/);
  if (m) {
    try { return JSON.parse(m[1]); } catch(e) {}
  }
  return null;
}

function getShortId(notes, id) {
  const m = String(notes || "").match(/BookingID:\s*(\d{6})/);
  if (m) return m[1];
  const value = String(id || "").toLowerCase();
  if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
  let hash = 0;
  for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return String(hash).padStart(6, "0").slice(0, 6);
}

async function createManualBooking(raw) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const shortId = await generateUniqueBookingId();
    raw.notes = `BookingID: ${shortId}\n${raw.notes || ""}`;
    const created = localCreate(raw);
    return { ...created, shortId };
  }

  /* ---- Supabase ---- */
  const shortId = await generateUniqueBookingId();
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .insert([{
      devotee_phone  : clean(raw.phone, 20),
      puja_id        : raw.pujaId        || null,
      price          : Number(raw.price) || 0,
      status         : raw.status        || "Pending",
      payment_status : raw.payment_status || "Pending",
      notes          : /BookingID:\s*\d{6}/.test(raw.notes || "") ? (clean(raw.notes, 500) || "") : `BookingID: ${shortId}\n${clean(raw.notes, 500) || ""}`
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

  return { ...booking, shortId };
}

function bookingPujaName(notes) {
  const lines = String(notes || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const named = lines.find(line => /^Puja:\s*/i.test(line));
  if (named) return named.replace(/^Puja:\s*/i, '') || 'Puja name unavailable';
  const legacy = lines.find(line => !/^(?:BookingID|razorpay_\w+|Family|WhatsApp|Date|Time|Venue):/i.test(line));
  return legacy || 'Puja name unavailable';
}

function paymentNotes(notes, paymentId) {
  const marker = 'razorpay_payment:' + paymentId;
  const existing = String(notes || '');
  return existing.split(/\r?\n/).includes(marker) ? existing : [existing, marker].filter(Boolean).join('\n');
}

async function all() {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    return readLocalBookings().map(b => ({
      id: b.id, shortId: getShortId(b.notes, b.id),
      price     : b.price,
      status    : b.status,
      createdAt : b.created_at,
      videoUrl  : b.video_url  || null,
      name      : b.name       || "Unknown",
      phone     : b.devotee_phone || "",
      notes     : b.notes || "",
      gotram: b.devotees?.gotra || '', puja: bookingPujaName(b.notes), snapshot: getSnapshot(b.notes)
    }));
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, price, status, created_at, notes, video_url,
      devotees ( name, phone, gotra ),\n        booking_names ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) { console.error("Error fetching bookings:", error); return []; }

  return data.map(b => ({
    id: b.id, shortId: getShortId(b.notes, b.id),
    price     : b.price,
    status    : b.status,
    createdAt : b.created_at,
    videoUrl  : b.video_url || null,
    name      : b.booking_names?.length > 0 ? b.booking_names[0].name : (b.devotees?.name || "Unknown"),
    phone     : b.devotees?.phone || "",
    notes     : b.notes || "",
    gotram: b.devotees?.gotra || '', puja: bookingPujaName(b.notes), snapshot: getSnapshot(b.notes)
  }));
}

async function getUserBookings(phone) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const p = clean(phone, 20);
    return readLocalBookings()
      .filter(b => b.devotee_phone === p)
      .map(b => ({
        id: b.id, shortId: getShortId(b.notes, b.id),
        price     : b.price,
        status    : b.status,
        createdAt : b.created_at,
        videoUrl  : b.video_url || null,
        name      : b.name || "Unknown",
        phone     : b.devotee_phone || "",
        puja      : bookingPujaName(b.notes),
    snapshot  : getSnapshot(b.notes)
      }));
  }

  /* ---- Supabase ---- */
  const p = clean(phone, 20);
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, price, status, created_at, notes, video_url,
      devotees!inner ( phone, name, gotra ),
      booking_names ( name )
    `)
    .eq("devotee_phone", p)
    .order("created_at", { ascending: false });

  if (error) { console.error("Error fetching user bookings:", error); return []; }

  return data.map(b => ({
    id: b.id, shortId: getShortId(b.notes, b.id),
    price     : b.price,
    status    : b.status,
    createdAt : b.created_at,
    videoUrl  : b.video_url || null,
    name      : b.booking_names?.length > 0 ? b.booking_names[0].name : (b.devotees?.name || "Unknown"),
    phone     : b.devotees?.phone || "",
    puja      : bookingPujaName(b.notes),
    snapshot  : getSnapshot(b.notes)
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

function mergePreservedNotes(existingNotes, newNotes) {
  const existingLines = String(existingNotes || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const isMetaLine = line => /^(?:BookingID:|razorpay_order:|razorpay_payment:|WhatsApp:)/i.test(line);
  const metaLines = existingLines.filter(isMetaLine);

  if (metaLines.length === 0) {
    return clean(newNotes, 1000);
  }

  const newLines = String(newNotes || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const finalLines = [];
  
  // 1. BookingID: line
  const existingBookingId = metaLines.find(l => /^BookingID:\s*/i.test(l));
  const newBookingId = newLines.find(l => /^BookingID:\s*/i.test(l));
  if (existingBookingId) {
    finalLines.push(existingBookingId);
  } else if (newBookingId) {
    finalLines.push(newBookingId);
  }

  // 2. Non-metadata user lines
  for (const line of newLines) {
    if (!isMetaLine(line)) {
      finalLines.push(line);
    }
  }

  // 3. WhatsApp: line
  const existingWa = metaLines.find(l => /^WhatsApp:\s*/i.test(l));
  const newWa = newLines.find(l => /^WhatsApp:\s*/i.test(l));
  if (newWa) {
    finalLines.push(newWa);
  } else if (existingWa) {
    finalLines.push(existingWa);
  }

  // 4. razorpay_order: line
  const existingOrder = metaLines.find(l => /^razorpay_order:/i.test(l));
  const newOrder = newLines.find(l => /^razorpay_order:/i.test(l));
  if (existingOrder) {
    finalLines.push(existingOrder);
  } else if (newOrder) {
    finalLines.push(newOrder);
  }

  // 5. razorpay_payment: line(s)
  const existingPayments = metaLines.filter(l => /^razorpay_payment:/i.test(l));
  const newPayments = newLines.filter(l => /^razorpay_payment:/i.test(l));
  const allPayments = Array.from(new Set([...existingPayments, ...newPayments]));
  for (const pay of allPayments) {
    finalLines.push(pay);
  }

  return clean(finalLines.join('\n'), 1000);
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
    if (data.notes !== undefined) bookings[idx].notes      = mergePreservedNotes(bookings[idx].notes, data.notes);
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const updateData = {};
  if (data.status)          updateData.status         = clean(data.status, 50);
  if (data.payment_status)  updateData.payment_status = clean(data.payment_status, 50);
  if (data.price !== undefined) updateData.price      = Number(data.price) || 0;
  if (data.notes !== undefined) {
    const { data: existing } = await supabase.from("bookings").select("notes").eq("id", id).single();
    updateData.notes = mergePreservedNotes(existing?.notes, data.notes);
  }

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
    return { id: b.id, shortId: getShortId(b.notes, b.id), puja: bookingPujaName(b.notes), price: b.price, userPhone: b.devotee_phone, whatsapp: String(b.notes || "").match(/^WhatsApp: (\d{10})$/m)?.[1] || b.devotee_phone };
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
  if (error) return null;
  return { id: data.id, shortId: getShortId(data.notes, data.id), puja: bookingPujaName(data.notes), price: data.price, userPhone: data.devotee_phone, whatsapp: String(data.notes || "").match(/^WhatsApp: (\d{10})$/m)?.[1] || data.devotee_phone };
}

async function attachOrder(id, orderId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    const existingNotes = bookings[idx].notes || "";
    bookings[idx].notes = existingNotes ? existingNotes + "\nrazorpay_order:" + orderId : "razorpay_order:" + orderId;
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  // We need to fetch existing notes to append
  const { data: b } = await supabase.from("bookings").select("notes").eq("id", id).single();
  const existingNotes = b?.notes || "";
  const newNotes = existingNotes ? existingNotes + "\nrazorpay_order:" + orderId : "razorpay_order:" + orderId;
  const { error } = await supabase.from("bookings").update({ notes: newNotes }).eq("id", id);
  return !error;
}

function paymentNotificationBooking(b) {
  return {
    id: b.id,
    shortId: typeof getShortId === 'function' ? getShortId(b.notes, b.id) : undefined,
    price: b.price,
    status: b.status,
    payment_status: b.payment_status,
    notes: b.notes,
    userPhone: b.devotee_phone,
    phone: String(b.notes || "").match(/^WhatsApp: (\d{10})$/m)?.[1] || b.devotee_phone || b.devotees?.phone || "",
    name: b.booking_names?.[0]?.name || b.name || b.devotees?.name || "Devotee",
    puja: bookingPujaName(b.notes)
  };
}

async function findByOrderId(orderId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const b = readLocalBookings().find(b => (b.notes || "").includes(`razorpay_order:${orderId}`));
    if (!b) return null;
    return paymentNotificationBooking(b);
  }

  /* ---- Supabase ---- */
  const { data, error } = await supabase
    .from("bookings")
    .select("id, price, status, payment_status, devotee_phone, notes, devotees(name, phone), booking_names(name)")
    .ilike("notes", `%razorpay_order:${orderId}%`)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return paymentNotificationBooking(data[0]);
}

async function markPaid(id, paymentId) {
  /* ---- LOCAL fallback ---- */
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].payment_status = "Paid";
    bookings[idx].status         = "Confirmed";
    bookings[idx].notes = paymentNotes(bookings[idx].notes, paymentId);
    writeLocalBookings(bookings);
    return true;
  }

  /* ---- Supabase ---- */
  const { data: current, error: readError } = await supabase.from("bookings")
    .select("notes").eq("id", id).single();
  if (readError || !current) return false;
  const { error } = await supabase.from("bookings").update({
    payment_status : "Paid",
    status         : "Confirmed",
    notes: paymentNotes(current.notes, paymentId)
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

async function findPendingDuplicate({ phone, price, puja, ref }) {
  if (!supabase) {
    const bookings = readLocalBookings();
    const existing = bookings.find(b =>
      b.devotee_phone === clean(phone, 20) &&
      b.status === "Pending" &&
      Number(b.price) === Number(price) &&
      b.notes && (
        (puja && (b.notes.includes("Puja: " + puja) || b.notes.includes(puja))) ||
        (ref && b.notes.includes(ref))
      )
    );
    if (!existing) return null;
    return { ...existing, shortId: getShortId(existing.notes, existing.id) };
  }
  return null;
}

async function claimBooking(bookingId, orderId) {
  if (!supabase) {
    const bookings = readLocalBookings();
    const idx = bookings.findIndex(b =>
      (bookingId && b.id === bookingId) ||
      (orderId && b.notes && b.notes.includes(orderId))
    );
    if (idx === -1) return false;
    bookings[idx].status = "Pending Verification";
    bookings[idx].payment_status = "Pending Verification";
    writeLocalBookings(bookings);
    return true;
  }
  let query = supabase.from("bookings").update({
    status: "Pending Verification",
    payment_status: "Pending Verification"
  });
  if (bookingId) query = query.eq("id", bookingId);
  else query = query.ilike("notes", `%razorpay_order:${orderId}%`);
  const { data, error } = await query.select();
  return !error && data && data.length > 0;
}

module.exports = {
  createManualBooking,
  all, getUserBookings,
  updateBookingVideo, updateBooking, deleteBooking,
  findById, attachOrder, findByOrderId, markPaid, setStatus,
  getShortId, findPendingDuplicate, claimBooking
};
