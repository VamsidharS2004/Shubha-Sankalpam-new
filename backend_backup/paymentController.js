/* ================================================================
   PAYMENT CONTROLLER — Razorpay order creation + webhook
   ================================================================
   Only active once RAZORPAY_KEY_ID / KEY_SECRET / WEBHOOK_SECRET
   are set in config.js. Until then, the frontend automatically
   keeps using the static UPI QR code instead (see payment.js and
   GET /api/payments/config below, which tells the frontend which
   mode is active).

   THE GOLDEN RULE THIS FILE FOLLOWS: never trust the browser about
   money. The amount charged always comes from the booking record
   we already validated server-side when it was created (see
   bookingController.js) — never from anything the frontend sends
   at payment time.
   ================================================================ */
const crypto = require("crypto");
const { send, readBody, readRawBody } = require("../utils/http");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = require("../config");
const bookingModel = require("../models/bookingModel");

const razorpayConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

/* GET /api/payments/config — tells the frontend whether to show
   Razorpay Checkout or fall back to the static UPI QR code */
async function getPaymentConfig(req, res) {
  send(res, 200, {
    razorpayEnabled: razorpayConfigured,
    keyId: razorpayConfigured ? RAZORPAY_KEY_ID : null
  });
}

/* POST /api/payments/order  { bookingId }
   Creates a Razorpay order for an EXISTING booking, using the
   booking's own already-validated price — never a price sent here. */
async function createOrder(req, res) {
  if (!razorpayConfigured) {
    return send(res, 400, { error: "Razorpay isn't configured — use the UPI QR payment flow instead." });
  }
  const { bookingId } = await readBody(req);
  const booking = await bookingModel.findById(String(bookingId || ""));
  if (!booking) return send(res, 404, { error: "Booking not found." });
  if (req.userPhone && booking.userPhone && booking.userPhone !== req.userPhone) {
    return send(res, 403, { error: "This booking doesn't belong to your account." });
  }

  const amountPaise = Math.round(booking.price * 100); // Razorpay wants paise, not rupees
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: booking.id })
  });
  if (!r.ok) {
    const errText = await r.text();
    console.error("⚠️  Razorpay order creation failed:", errText);
    return send(res, 502, { error: "Could not start payment — please try again." });
  }
  const order = await r.json();
  await bookingModel.attachOrder(booking.id, order.id);

  send(res, 200, { orderId: order.id, amount: amountPaise, keyId: RAZORPAY_KEY_ID, bookingId: booking.id });
}

/* POST /api/payments/webhook — Razorpay calls this directly the
   moment a payment succeeds or fails. This is the SOURCE OF TRUTH
   for "did the money actually arrive" — never the browser redirect,
   which can be closed, crash, or lie. */
async function webhook(req, res) {
  const rawBody = req._rawBody; // set by server.js before this runs — see there
  const signature = req.headers["x-razorpay-signature"];

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error("⚠️  Razorpay webhook secret missing — rejecting webhook");
    return send(res, 500, { error: "Webhook secret not configured" });
  }

  if (!signature) {
    console.error("⚠️  Razorpay webhook signature missing");
    return send(res, 400, { error: "Missing signature" });
  }

  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    console.error("⚠️  Razorpay webhook signature mismatch — ignoring (possible spoofed request)");
    return send(res, 400, { error: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return send(res, 400, { error: "Invalid JSON" });
  }
  const payment = event.payload && event.payload.payment && event.payload.payment.entity;

  if ((event.event === "payment.captured" || event.event === "order.paid") && payment) {
    const booking = await bookingModel.findByOrderId(payment.order_id);
    if (booking) {
      // Basic idempotency check via fetching all bookings to see if already confirmed
      const allBookings = await bookingModel.all();
      const bFull = allBookings.find(b => b.id === booking.id);
      if (bFull && (bFull.status === "Confirmed" || bFull.status === "Paid")) {
        console.log(`ℹ️ Payment already processed for booking ${booking.id}`);
      } else {
        await bookingModel.markPaid(booking.id, payment.id);
        console.log(`✅ Payment CONFIRMED via webhook: booking ${booking.id} (₹${booking.price})`);
      }
    } else {
      console.log(`ℹ️ Booking not found for order ${payment.order_id} (might be already marked paid)`);
    }
  }

  if (event.event === "payment.failed" && payment) {
    const booking = await bookingModel.findByOrderId(payment.order_id);
    if (booking) {
      const allBookings = await bookingModel.all();
      const bFull = allBookings.find(b => b.id === booking.id);
      if (bFull && (bFull.status === "Confirmed" || bFull.status === "Paid")) {
        console.log(`ℹ️ Ignoring payment.failed because booking ${booking.id} is already Confirmed`);
      } else {
        await bookingModel.setStatus(booking.id, "failed");
        console.log(`❌ Payment FAILED via webhook: booking ${booking.id}`);
      }
    }
  }

  // Handle refund events safely
  if (event.event && event.event.startsWith("refund.")) {
    const refund = event.payload && event.payload.refund && event.payload.refund.entity;
    if (refund) {
      console.log(`ℹ️ Refund event ${event.event} received. Refund ID: ${refund.id}, Payment ID: ${refund.payment_id}`);
    }
  }

  return send(res, 200, { ok: true }); // Razorpay just needs a 200 to stop retrying
}


/* POST /api/payments/verify 
   Synchronous frontend verification */
async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = await readBody(req);
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return send(res, 400, { error: "Missing parameters" });
  }

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (expected === razorpay_signature) {
    await bookingModel.markPaid(bookingId, razorpay_payment_id);
    return send(res, 200, { success: true });
  } else {
    // Payment failure: store failed status
    await bookingModel.setStatus(bookingId, 'failed');
    return send(res, 400, { error: "Invalid signature" });
  }
}

module.exports = {
  verifyPayment, getPaymentConfig, createOrder, webhook, razorpayConfigured };

