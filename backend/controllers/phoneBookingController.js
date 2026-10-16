/* ================================================================
   PHONE / CUSTOMER-CARE BOOKINGS
   An employee adds a booking by hand after the customer paid by QR / UPI.
   The booking is saved in the same shape as a website booking, so it shows in
   the customer's account, in View details and in the CSV / Excel export, and
   a WhatsApp confirmation (same AiSensy template as the website) is sent.
   ================================================================ */
const { send, readBody, clean, normalizePhone } = require("../utils/http");
const bookingModel = require("../models/bookingModel");
const userModel = require("../models/userModel");
const catalog = require("../utils/catalog");
const { sendAiSensyDetailed } = require("../utils/whatsapp");
const { manualBookingParams } = require("../utils/paymentTemplates");
const { AISENSY_API_KEY } = require("../config");

const SOURCE = "Phone / customer care";
const METHODS = ["UPI / QR", "Bank transfer", "Cash", "Other"];
const isIsoDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const oneLine = (v, max) => clean(v, max).replace(/[\r\n]+/g, " ");

function fail(res, status, error, extra = {}) { return send(res, status, { error, ...extra }); }

/* Sends the confirmation. Returns { status: "sent" | "failed" | "not-configured", error? }. Never throws. */
async function sendConfirmation({ whatsapp, name, puja, pujaDate, pujaTime, venue, shortId, amount, method }) {
  if (!AISENSY_API_KEY) return { status: "not-configured", error: "WhatsApp (AiSensy) is not configured on this server." };
  try {
    const campaign = process.env.AISENSY_MANUAL_TEMPLATE || process.env.AISENSY_SUCCESS_TEMPLATE || "payment_success";
    const params = manualBookingParams({ name, puja, pujaDate, pujaTime, venue, shortId, amount, method });
    const r = await sendAiSensyDetailed(whatsapp, campaign, name, params);
    return r.ok ? { status: "sent" } : { status: "failed", error: r.error + ` (template: ${campaign})` };
  } catch (e) {
    console.error("[Phone booking] WhatsApp confirmation failed:", e.message);
    return { status: "failed", error: e.message };
  }
}

async function createPhoneBooking(req, res) {
  const raw = await readBody(req);

  /* ---- what was booked ---- */
  const item = catalog.resolveItem(raw.pujaRef, null);
  if (!item) return fail(res, 400, "Please choose a puja or package.");
  const price = raw.price === undefined || raw.price === "" ? item.price : Number(raw.price);
  if (!Number.isFinite(price) || price <= 0 || price > 10000000) return fail(res, 400, "Enter a valid price.");

  /* ---- who ---- */
  const digits = String(raw.phone || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) return fail(res, 400, "Enter the customer's 10-digit mobile number.");
  const phone = normalizePhone(digits);                       // +91XXXXXXXXXX — same form the account login uses
  const names = (Array.isArray(raw.devoteeNames) ? raw.devoteeNames : []).map(n => oneLine(n, 100)).filter(Boolean).slice(0, 10);
  if (!names.length) return fail(res, 400, "Enter at least one devotee name.");
  const gotramUnknown = raw.gotramUnknown === true;
  const gotram = gotramUnknown ? "" : oneLine(raw.gotram, 100);
  if (item.cat === "Special Puja" && !gotram && !gotramUnknown) return fail(res, 400, "Gotram is required for this special puja.");
  const sankalpam = clean(raw.sankalpam, 500);

  /* ---- when ---- */
  if (!isIsoDate(raw.pujaDate)) return fail(res, 400, "Choose the puja date.");
  const pujaTime = /^\d{2}:\d{2}$/.test(String(raw.pujaTime || "")) ? raw.pujaTime : "";

  /* ---- payment ---- */
  const paid = raw.paymentReceived === true;
  const method = paid ? (METHODS.includes(raw.paymentMethod) ? raw.paymentMethod : null) : "";
  if (paid && !method) return fail(res, 400, "Choose how the customer paid.");
  const paymentRef = paid ? oneLine(raw.paymentRef, 60) : "";
  if (paid && method !== "Cash" && paymentRef.length < 6) return fail(res, 400, "Enter the payment reference / UPI transaction ID from the screenshot.");
  const amountReceived = paid ? (raw.amountReceived === undefined || raw.amountReceived === "" ? price : Number(raw.amountReceived)) : 0;
  if (paid && (!Number.isFinite(amountReceived) || amountReceived <= 0)) return fail(res, 400, "Enter the amount received.");

  /* ---- safety checks (the employee can override the duplicate warning, never the payment-reference one) ---- */
  try {
    if (paymentRef) {
      const used = await bookingModel.findByNoteLine(`PaymentRef: ${paymentRef}`);
      if (used) return fail(res, 409, `This payment reference is already used on booking ${used.shortId}.`, { code: "payment-ref-used" });
    }
    if (raw.allowDuplicate !== true) {
      const existing = await bookingModel.notesForPhone(phone);
      const clash = existing.find(b => !/cancel|fail/i.test(b.status || "") && b.notes.split(/\r?\n/).includes(`Puja: ${item.name}`) && b.notes.split(/\r?\n/).includes(`PujaDate: ${raw.pujaDate}`));
      if (clash) return fail(res, 409, "This customer already has a booking for this puja on this date.", { code: "duplicate" });
    }
  } catch (e) { return fail(res, 503, e.message); }

  /* ---- customer account (so the booking appears when they log in) ---- */
  await userModel.findOrCreate(phone, { name: names[0] });
  const profile = { name: names[0], whatsapp: digits };
  if (gotram) profile.gotra = gotram;
  await userModel.updateDevotee(phone, profile);

  /* ---- save, in the same shape as a website booking ---- */
  const enteredAt = new Date().toISOString();
  const bookingDetails = {
    devoteeNames: names, gotram, gotramUnknown, sankalpam, whatsapp: digits,
    source: SOURCE, pujaDate: raw.pujaDate, ...(pujaTime ? { pujaTime } : {}),
    ...(paid ? { paymentMethod: method, paymentReference: paymentRef || "Cash", amountReceived } : { paymentStatus: "Not received yet" }),
    enteredBy: "Admin panel", enteredAt, extraFields: []
  };
  const notes = [
    `Puja: ${item.name}`,
    "Snapshot: " + JSON.stringify({ id: item.id || "", name: item.name, price: item.price,
      image: item.image || (typeof item.media === "string" ? item.media : (item.media && item.media.image)) || "", temple: item.temple || "", cat: item.cat || "" }),
    `WhatsApp: ${digits}`,
    `Family: ${names.join("; ")}${sankalpam ? " | Sankalpam: " + sankalpam.replace(/[\r\n]+/g, " ") : ""}`,
    `Source: ${SOURCE}`,
    `PujaDate: ${raw.pujaDate}`,
    ...(pujaTime ? [`PujaTime: ${pujaTime}`] : []),
    ...(paid ? [`PaymentMethod: ${method}`, `PaymentRef: ${paymentRef || "Cash"}`] : []),
    `EnteredBy: Admin panel at ${enteredAt}`,
    "BookingDetails: " + JSON.stringify(bookingDetails)
  ].join("\n");

  let booking;
  try {
    booking = await bookingModel.createManualBooking({
      phone, name: names[0], gotra: gotram, price, source: "Phone", notes,
      status: paid ? "Confirmed" : "Pending", payment_status: paid ? "Paid" : "Pending"
    });
  } catch (e) { return fail(res, e.status || 500, e.message || "Failed to create booking."); }
  if (!booking) return fail(res, 400, "Failed to create booking.");
  const shortId = booking.shortId || bookingModel.getShortId(booking.notes, booking.id);

  /* ---- WhatsApp confirmation (only once payment is received) ---- */
  let whatsapp = "skipped", whatsappError;
  if (paid && raw.sendWhatsApp !== false) {
    ({ status: whatsapp, error: whatsappError } = await sendConfirmation({ whatsapp: digits, name: names[0], puja: item.name, pujaDate: raw.pujaDate, pujaTime, venue: item.temple, shortId, amount: amountReceived, method }));
  }
  console.log(`[Phone booking] ${shortId} saved (${paid ? "paid" : "pending"}), WhatsApp: ${whatsapp}`);
  send(res, 201, { ok: true, id: booking.id, shortId, status: paid ? "Confirmed" : "Pending", whatsapp, whatsappError });
}

/* Employee presses "Resend WhatsApp confirmation" on a phone booking. */
async function resendConfirmation(req, res, url) {
  const id = url.searchParams.get("id");
  if (!id) return fail(res, 400, "Missing booking id.");
  const b = await bookingModel.findFullById(id);
  if (!b) return fail(res, 404, "Booking not found.");
  const line = key => (String(b.notes).match(new RegExp(`^${key}: (.*)$`, "m")) || [])[1] || "";
  if (line("Source") !== SOURCE) return fail(res, 400, "Only bookings added from the admin panel can be resent from here.");
  if (b.payment_status !== "Paid") return fail(res, 400, "Payment has not been marked as received for this booking.");
  const digits = line("WhatsApp").replace(/\D/g, "").slice(-10) || String(b.phone || "").replace(/\D/g, "").slice(-10);
  const puja = line("Puja");
  const item = catalog.resolveItem(null, puja);
  let details = {};
  try { details = JSON.parse(line("BookingDetails") || "{}"); } catch (_) {}
  const { status: result, error: whatsappError } = await sendConfirmation({
    whatsapp: digits, name: (details.devoteeNames && details.devoteeNames[0]) || b.name || "Devotee", puja,
    pujaDate: line("PujaDate"), pujaTime: line("PujaTime"), venue: item && item.temple,
    shortId: bookingModel.getShortId(b.notes, b.id), amount: details.amountReceived || b.price, method: line("PaymentMethod")
  });
  send(res, result === "sent" ? 200 : 502, { ok: result === "sent", whatsapp: result,
    error: result === "sent" ? undefined : whatsappError || "WhatsApp could not be sent." });
}

module.exports = { createPhoneBooking, resendConfirmation };
