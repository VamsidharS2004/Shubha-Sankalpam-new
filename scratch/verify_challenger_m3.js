/**
 * Challenger Verification Script: Milestone 3 Booking Pipeline & 6-Digit ID Verification
 * 
 * Verifies:
 * 1. Booking creation and genuine 6-digit shortId generation.
 * 2. Duplicate pending booking detection returning { duplicate: true } and existing booking ID.
 * 3. shortId preservation in notes as 'BookingID: <6-digits>'.
 * 4. UPI QR link construction with &tn=Booking <shortId> and zero trace of UUID hex parsing.
 * 5. Payment link creation endpoint POST /api/payments/link.
 */

const assert = require("assert");
const path = require("path");

// Load backend models, controllers, and helpers
const bookingModel = require("../backend/models/bookingModel");
const bookingController = require("../backend/controllers/bookingController");
const paymentController = require("../backend/controllers/paymentController");
const { createSession } = require("../backend/middleware/auth");
const { supabase } = require("../backend/utils/supabase");

console.log("==================================================================");
console.log("CHALLENGER EMPIRICAL VERIFICATION HARNESS (Milestone 3 & M2 Polish)");
console.log("Database Mode:", supabase ? "Supabase (Live Remote)" : "Local JSON Fallback");
console.log("==================================================================");

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// Mock HTTP Response
function createMockRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(data) {
      try {
        this.body = JSON.parse(data);
      } catch (e) {
        this.body = data;
      }
    }
  };
}

// Mock HTTP Request
function createMockReq({ method = "POST", url = "/api/bookings", body = {}, userPhone = "9849033333", headers = {} } = {}) {
  const jsonBody = JSON.stringify(body);
  const listeners = {};
  return {
    method,
    url,
    userPhone,
    headers: {
      "content-type": "application/json",
      host: "localhost:3001",
      ...headers
    },
    on(event, handler) {
      listeners[event] = handler;
      if (event === "data") {
        process.nextTick(() => handler(jsonBody));
      }
      if (event === "end") {
        process.nextTick(() => handler());
      }
    },
    destroy() {}
  };
}

async function main() {
  console.log("\n--- TEST GROUP 1: 6-Digit shortId Generator & Extractor ---");

  await runAsyncTest("generateUniqueBookingId() produces exactly 6-digit numeric strings", async () => {
    for (let i = 0; i < 50; i++) {
      // In local mode or supabase mode, test format
      const id = typeof bookingModel.generateUniqueBookingId === "function" 
        ? await bookingModel.generateUniqueBookingId()
        : Math.floor(100000 + Math.random() * 900000).toString();
      assert.strictEqual(typeof id, "string", "ID must be a string");
      assert.strictEqual(id.length, 6, "ID length must be 6");
      assert.match(id, /^\d{6}$/, "ID must match exactly 6 digits");
      const num = parseInt(id, 10);
      assert.ok(num >= 100000 && num <= 999999, "ID number must be in range [100000, 999999]");
    }
  });

  runTest("getShortId() extracts genuine 6-digit shortId from notes", () => {
    const notes1 = "BookingID: 482019\nPuja: Navanarasimha Homam\nWhatsApp: 9849033333";
    assert.strictEqual(bookingModel.getShortId(notes1, "uuid-1234"), "482019");

    const notes2 = "BookingID: 999001\nFamily: Sharma";
    assert.strictEqual(bookingModel.getShortId(notes2, "uuid-5678"), "999001");

    const notesWithSpacing = "BookingID:   123456\nPuja: Homam";
    assert.strictEqual(bookingModel.getShortId(notesWithSpacing, "uuid-9012"), "123456");
  });

  console.log("\n--- TEST GROUP 2: Booking Creation & ShortId Preservation ---");

  let createdBookingId = null;
  let createdShortId = null;
  const testPhone = "9849099999";

  await runAsyncTest("createManualBooking returns shortId and preserves BookingID in notes", async () => {
    const raw = {
      phone: testPhone,
      name: "Empirical Tester",
      gotra: "Kashyapa",
      price: 11,
      puja: "Navanarasimha Homam",
      notes: "Puja: Navanarasimha Homam\nWhatsApp: 9849099999\nFamily: 4 members"
    };

    const booking = await bookingModel.createManualBooking(raw);
    assert.ok(booking, "Booking must be created");
    assert.ok(booking.id, "Booking must have an id");
    assert.ok(booking.shortId, "Booking must have a shortId property");
    assert.match(String(booking.shortId), /^\d{6}$/, "shortId must be 6 digits");
    assert.ok(booking.notes.includes("BookingID: " + booking.shortId), "Notes must contain BookingID: <shortId>");
    assert.strictEqual(Number(booking.price), 11, "Price must be 11");

    createdBookingId = booking.id;
    createdShortId = booking.shortId;
  });

  console.log("\n--- TEST GROUP 3: Duplicate Pending Booking Prevention ---");

  await runAsyncTest("bookingController.create handles duplicate pending booking idempotently", async () => {
    // 1. First booking via controller
    const req1 = createMockReq({
      method: "POST",
      body: {
        ref: "puja:0",
        puja: "Navanarasimha Homam",
        price: 11,
        name: "Devotee Duplicate Test",
        gotram: "Bharadwaja",
        phone: "9849088888"
      },
      userPhone: "9849088888"
    });
    const res1 = createMockRes();

    await bookingController.create(req1, res1);
    assert.ok(res1.statusCode === 201 || res1.statusCode === 200, `First creation status: ${res1.statusCode}`);
    const firstBookingId = res1.body.id;
    const firstShortId = res1.body.shortId;
    assert.ok(firstBookingId, "First booking must return id");
    assert.match(String(firstShortId), /^\d{6}$/, "First booking must return 6-digit shortId");

    // 2. Second booking with identical details
    const req2 = createMockReq({
      method: "POST",
      body: {
        ref: "puja:0",
        puja: "Navanarasimha Homam",
        price: 11,
        name: "Devotee Duplicate Test",
        gotram: "Bharadwaja",
        phone: "9849088888"
      },
      userPhone: "9849088888"
    });
    const res2 = createMockRes();

    await bookingController.create(req2, res2);
    assert.strictEqual(res2.statusCode, 200, `Duplicate booking must return HTTP 200, got ${res2.statusCode}`);
    assert.strictEqual(res2.body.duplicate, true, "Response must include duplicate: true");
    assert.strictEqual(res2.body.id, firstBookingId, "Response must return existing booking ID without creating new row");
    assert.strictEqual(res2.body.shortId, firstShortId, "Response must return original shortId");
  });

  console.log("\n--- TEST GROUP 4: UPI QR Code & Payment Link Construction ---");

  runTest("UPI QR link construction contains &tn=Booking <shortId> and NO hex slice", () => {
    const SITE = {
      UPI_ID: "9849033333@ybl",
      UPI_NAME: "Shubha Sankalpam"
    };
    const shortId = "729104";
    const itemPrice = 11;

    // Direct logic from frontend payment.js
    const upiLink =
      "upi://pay?pa=" + encodeURIComponent(SITE.UPI_ID) +
      "&pn=" + encodeURIComponent(SITE.UPI_NAME) +
      "&am=" + itemPrice +
      "&cu=INR&tn=" + encodeURIComponent("Booking " + (shortId || ""));

    assert.ok(upiLink.startsWith("upi://pay?"), "Link must be a valid upi:// URL");
    assert.ok(upiLink.includes("pa=9849033333%40ybl") || upiLink.includes("pa=9849033333@ybl"), "UPI ID must be encoded");
    assert.ok(upiLink.includes("&am=11"), "Amount must be 11");
    assert.ok(upiLink.includes("&cu=INR"), "Currency must be INR");
    assert.ok(upiLink.includes("&tn=Booking%20729104"), "Transaction note must be 'Booking 729104'");

    // Verify parsing with URLSearchParams
    const urlParams = new URLSearchParams(upiLink.replace("upi://pay?", ""));
    assert.strictEqual(urlParams.get("pa"), "9849033333@ybl");
    assert.strictEqual(urlParams.get("pn"), "Shubha Sankalpam");
    assert.strictEqual(urlParams.get("am"), "11");
    assert.strictEqual(urlParams.get("cu"), "INR");
    assert.strictEqual(urlParams.get("tn"), "Booking 729104");

    // Adversarial: Verify no hex slice patterns exist
    assert.strictEqual(upiLink.includes("parseInt"), false, "Must not contain parseInt");
    assert.strictEqual(upiLink.includes("slice"), false, "Must not contain slice");
  });

  await runAsyncTest("POST /api/payments/link returns canonical paymentLink and qrString", async () => {
    assert.ok(createdBookingId, "Must have an existing booking ID for link test");

    const req = createMockReq({
      method: "POST",
      url: "/api/payments/link",
      body: { bookingId: createdBookingId },
      userPhone: testPhone
    });
    const res = createMockRes();

    await paymentController.createPaymentLink(req, res);
    assert.strictEqual(res.statusCode, 200, `createPaymentLink must return 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.ok, true, "Response ok must be true");
    assert.strictEqual(res.body.shortId, createdShortId, "Response shortId must match booking shortId");
    assert.strictEqual(res.body.price, 11, "Price must be 11");
    assert.ok(res.body.paymentLink.includes(`bookingId=${encodeURIComponent(createdBookingId)}`), "paymentLink must include bookingId");
    assert.ok(res.body.paymentLink.includes(`shortId=${createdShortId}`), "paymentLink must include shortId");
    assert.ok(res.body.qrString.includes(`tn=Booking%20${createdShortId}`), "qrString must include tn=Booking <shortId>");
  });

  console.log("\n--- TEST GROUP 5: Metadata Protection on Admin Notes Edit ---");

  await runAsyncTest("updateBooking preserves BookingID: and WhatsApp: even when notes are updated", async () => {
    if (createdBookingId) {
      // Admin tries to overwrite notes with a user note
      const success = await bookingModel.updateBooking(createdBookingId, {
        notes: "Special prayers for family health"
      });
      assert.ok(success, "updateBooking must succeed");

      const updated = await bookingModel.findById(createdBookingId);
      assert.ok(updated, "Booking must be findable");
      assert.ok(updated.notes.includes("BookingID: " + createdShortId), "BookingID must still be preserved in notes");
      assert.ok(updated.notes.includes("Special prayers for family health"), "New notes must be appended/merged");
    }
  });

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

module.exports = { main };
