/* ================================================================
   SUBSCRIPTION CONTROLLER — Razorpay AutoPay / Subscriptions
   ================================================================
   Called when a customer wants to enable AutoPay after booking a
   package. Creates a Razorpay Plan (if not already existing) and
   a Subscription, then returns the subscription_id so the frontend
   can open the Razorpay Checkout modal for mandate authorization.
   ================================================================ */
const crypto = require("crypto");
const { send, readBody, readRawBody } = require("../utils/http");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = require("../config");
const bookingModel = require("../models/bookingModel");

const razorpayAuth = () =>
  "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

const razorpayConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

/* ----------------------------------------------------------------
   Helper — call Razorpay REST API
   ---------------------------------------------------------------- */
async function rzpPost(path, body) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: razorpayAuth(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.description || "Razorpay API error");
  return data;
}

async function rzpGet(path) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    headers: { Authorization: razorpayAuth() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.description || "Razorpay API error");
  return data;
}

/* ----------------------------------------------------------------
   POST /api/subscriptions/create
   Body: { bookingId, packageName, pricePerMonth }
   Returns: { subscriptionId, keyId, amount }
   ---------------------------------------------------------------- */
async function create(req, res) {
  if (!razorpayConfigured) {
    return send(res, 400, { error: "Razorpay is not configured." });
  }

  const { bookingId, packageName, pricePerMonth } = await readBody(req);

  if (!bookingId || !packageName || !pricePerMonth) {
    return send(res, 400, { error: "bookingId, packageName and pricePerMonth are required." });
  }

  const amountPaise = Math.round(Number(pricePerMonth) * 100);
  if (!amountPaise || amountPaise < 100) {
    return send(res, 400, { error: "Invalid price." });
  }

  try {
    /* Step 1 — Create a Razorpay Plan for this package price.
       In production you'd cache/reuse plan IDs per package, but
       creating a new plan each time is safe and simple for now. */
    const plan = await rzpPost("/plans", {
      period: "monthly",
      interval: 1,
      item: {
        name: packageName,
        amount: amountPaise,
        currency: "INR",
        description: `Monthly subscription — ${packageName}`
      },
      notes: { booking_id: bookingId }
    });

    /* Step 2 — Create a Subscription tied to that plan.
       start_at = beginning of next month so the customer isn't
       double-charged (they already paid this month manually). */
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startAt = Math.floor(nextMonth.getTime() / 1000);

    const subscription = await rzpPost("/subscriptions", {
      plan_id: plan.id,
      total_count: 120,       // 10 years max; customer can cancel anytime
      quantity: 1,
      start_at: startAt,
      customer_notify: 1,     // Razorpay sends reminders automatically
      notes: {
        booking_id: bookingId,
        package_name: packageName
      }
    });

    /* Step 3 — Persist subscription_id against the booking */
    try {
      await bookingModel.updateBooking(bookingId, {
        notes: `subscription_id:${subscription.id}|plan_id:${plan.id}`
      });
    } catch (e) {
      // non-fatal — subscription still works even if we can't persist
      console.warn("Could not attach subscription_id to booking:", e.message);
    }

    console.log(`🔄 AutoPay subscription created: ${subscription.id} for booking ${bookingId}`);

    send(res, 200, {
      subscriptionId: subscription.id,
      keyId: RAZORPAY_KEY_ID,
      amount: amountPaise,
      planId: plan.id
    });
  } catch (e) {
    console.error("Subscription creation error:", e.message);
    send(res, 502, { error: "Could not create subscription: " + e.message });
  }
}

/* ----------------------------------------------------------------
   POST /api/subscriptions/webhook
   Razorpay calls this for every subscription event.
   ---------------------------------------------------------------- */
async function webhook(req, res) {
  const rawBody = req._rawBody;
  const signature = req.headers["x-razorpay-signature"];

  /* Verify signature only if a webhook secret is configured */
  if (RAZORPAY_WEBHOOK_SECRET && signature) {
    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    if (signature !== expected) {
      console.error("⚠️  Subscription webhook signature mismatch");
      return send(res, 400, { error: "Invalid signature." });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); } catch (e) {
    return send(res, 400, { error: "Invalid JSON" });
  }

  const sub = event.payload?.subscription?.entity;
  const payment = event.payload?.payment?.entity;

  switch (event.event) {
    case "subscription.charged":
      console.log(`✅ AutoPay charged — subscription: ${sub?.id}, payment: ${payment?.id}`);
      /* Future: update booking status / send WhatsApp confirmation */
      break;

    case "subscription.cancelled":
      console.log(`❌ AutoPay cancelled — subscription: ${sub?.id}`);
      break;

    case "subscription.halted":
      console.log(`⚠️  AutoPay halted (payment failed) — subscription: ${sub?.id}`);
      break;

    case "subscription.authenticated":
      console.log(`🔐 AutoPay mandate authorized — subscription: ${sub?.id}`);
      break;

    default:
      /* ignore other events */
  }

  send(res, 200, { ok: true });
}

module.exports = { create, webhook };
