const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const { handleApi } = require("../backend/routes/api");
const bookingModel = require("../backend/models/bookingModel");
const bookingController = require("../backend/controllers/bookingController");
const paymentController = require("../backend/controllers/paymentController");
const { RAZORPAY_WEBHOOK_SECRET, ADMIN_PASSWORD } = require("../backend/config");

// Mock HTTP helper to test handleApi and controllers
function createMockReqRes({ method = "GET", url = "/", headers = {}, body = null, rawBody = null, userPhone = null }) {
  const parsedUrl = new URL(url, "http://localhost:3000");
  const req = {
    method,
    url: parsedUrl.pathname + parsedUrl.search,
    headers: { ...headers },
    userPhone,
    _rawBody: rawBody,
    on: (event, handler) => {
      if (event === "data" && body !== null) {
        handler(typeof body === "string" ? Buffer.from(body) : Buffer.from(JSON.stringify(body)));
      }
      if (event === "end") {
        handler();
      }
    }
  };

  let statusCode = 200;
  let responseHeaders = {};
  let responseBody = null;

  const res = {
    writeHead: (code, hdrs) => {
      statusCode = code;
      responseHeaders = hdrs || {};
    },
    setHeader: (name, val) => {
      responseHeaders[name] = val;
    },
    end: (chunk) => {
      if (chunk) {
        try {
          responseBody = JSON.parse(chunk.toString());
        } catch (e) {
          responseBody = chunk.toString();
        }
      }
    },
    get statusCode() { return statusCode; },
    get headers() { return responseHeaders; },
    get body() { return responseBody; }
  };

  return { req, res, url: parsedUrl };
}

async function runTests() {
  console.log("=== EMPIRICAL CHALLENGER 2: ADVERSARIAL TEST HARNESS ===");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${name}:`, err.message);
        console.error(err.stack);
        failed++;
      }
    })();
  }

  // =========================================================================
  // 1. POST /api/payments/link (F28)
  // =========================================================================
  console.log("\n--- Category 1: POST /api/payments/link (F28) ---");

  // Setup: Create a test booking
  const testBooking = await bookingModel.createManualBooking({
    phone: "9876543210",
    name: "Empirical Test Devotee",
    price: 11,
    puja: "Navanarasimha Homam",
    notes: "WhatsApp: 9876543210\nPuja: Navanarasimha Homam"
  });

  assert.ok(testBooking && testBooking.id, "Failed to setup test booking");
  const bookingId = testBooking.id;

  await test("F28.1: Generates paymentLink and qrString with canonical 6-digit shortId using { bookingId }", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/link",
      headers: { host: "shubhasankalpam.com" },
      body: { bookingId }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true, "Route /api/payments/link should be handled");
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.ok, true, "Response ok should be true");
    assert.strictEqual(typeof res.body.paymentLink, "string", "paymentLink should be string");
    assert.strictEqual(typeof res.body.qrString, "string", "qrString should be string");
    assert.strictEqual(typeof res.body.shortId, "string", "shortId should be string");
    assert.strictEqual(res.body.price, 11, "Price should match booking price 11");

    // Canonical 6-digit shortId check
    assert.match(res.body.shortId, /^\d{6}$/, `shortId '${res.body.shortId}' must be strictly 6 digits`);

    // Verify paymentLink structure
    assert.ok(
      res.body.paymentLink.includes(`bookingId=${encodeURIComponent(bookingId)}`),
      `paymentLink must include bookingId=${bookingId}`
    );
    assert.ok(
      res.body.paymentLink.includes(`shortId=${encodeURIComponent(res.body.shortId)}`),
      `paymentLink must include shortId=${res.body.shortId}`
    );

    // Verify UPI QR string structure
    assert.ok(res.body.qrString.startsWith("upi://pay?"), "qrString must start with upi://pay?");
    assert.ok(res.body.qrString.includes("am=11"), "qrString must include am=11");
    assert.ok(res.body.qrString.includes("cu=INR"), "qrString must include cu=INR");
    assert.ok(
      res.body.qrString.includes(`tn=Booking%20${res.body.shortId}`),
      `qrString must include tn=Booking%20${res.body.shortId}`
    );
  });

  await test("F28.2: Accepts alternative payload format { id: bookingId }", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/link",
      body: { id: bookingId }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.match(res.body.shortId, /^\d{6}$/);
  });

  await test("F28.3: Adversarial - Rejects missing bookingId with 400", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/link",
      body: {}
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error, "Should return error message");
  });

  await test("F28.4: Adversarial - Rejects non-existent booking with 404", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/link",
      body: { bookingId: "00000000-0000-0000-0000-000000000000" }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error, "Should return 404 error");
  });

  await test("F28.5: Adversarial - Rejects unauthorized user (phone mismatch) with 403", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/link",
      userPhone: "9999999999", // Different phone from booking phone 9876543210
      body: { bookingId }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.error, "This booking doesn't belong to your account.");
  });

  // =========================================================================
  // 2. POST /api/bookings/claim (F27)
  // =========================================================================
  console.log("\n--- Category 2: POST /api/bookings/claim (F27) ---");

  // Create two fresh bookings for claim tests
  const claimBooking1 = await bookingModel.createManualBooking({
    phone: "9123456780",
    name: "Claim Test Devotee 1",
    price: 11,
    puja: "Navanarasimha Homam",
    notes: "WhatsApp: 9123456780\nPuja: Navanarasimha Homam"
  });
  const claimBooking2 = await bookingModel.createManualBooking({
    phone: "9123456781",
    name: "Claim Test Devotee 2",
    price: 11,
    puja: "Navanarasimha Homam",
    notes: "WhatsApp: 9123456781\nPuja: Navanarasimha Homam"
  });

  await test("F27.1: Claims booking using payload { id: bookingId } and updates status to 'Pending Verification'", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/bookings/claim",
      body: { id: claimBooking1.id }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.success, true);

    // Verify database status
    const updated = await bookingModel.findById(claimBooking1.id);
    assert.ok(updated, "Booking must exist");
    // Also check raw record
    const all = await bookingModel.all();
    const raw = all.find(b => b.id === claimBooking1.id);
    assert.ok(raw, "Raw booking record must be in all()");
    assert.strictEqual(raw.status, "Pending Verification", "Status must be 'Pending Verification'");
  });

  await test("F27.2: Claims booking using alternative payload { bookingId } and updates status to 'Pending Verification'", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/bookings/claim",
      body: { bookingId: claimBooking2.id }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);

    const all = await bookingModel.all();
    const raw = all.find(b => b.id === claimBooking2.id);
    assert.strictEqual(raw.status, "Pending Verification", "Status must be 'Pending Verification'");
  });

  await test("F27.3: Adversarial - Rejects empty payload with 400", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/bookings/claim",
      body: {}
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, "Missing booking id or order id");
  });

  await test("F27.4: Adversarial - Rejects non-existent booking id with 400", async () => {
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/bookings/claim",
      body: { id: "non-existent-booking-id" }
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, "Payment not verified or booking not found");
  });

  // =========================================================================
  // 3. Webhook Idempotency (F29)
  // =========================================================================
  console.log("\n--- Category 3: Webhook Idempotency (F29) ---");

  // Create booking for webhook testing
  const webhookBooking = await bookingModel.createManualBooking({
    phone: "9849033333",
    name: "Webhook Idempotency Devotee",
    price: 11,
    puja: "Navanarasimha Homam",
    notes: "WhatsApp: 9849033333\nPuja: Navanarasimha Homam"
  });
  const mockOrderId = "order_test_webhook_" + Date.now();
  await bookingModel.attachOrder(webhookBooking.id, mockOrderId);

  // Helper to generate valid Razorpay webhook request
  function createSignedWebhookReq(eventObj) {
    const rawBody = JSON.stringify(eventObj);
    const signature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    return createMockReqRes({
      method: "POST",
      url: "/api/payments/webhook",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json"
      },
      rawBody: rawBody,
      body: eventObj
    });
  }

  // Intercept sendAiSensyMessage to count notifications
  const whatsappUtil = require("../backend/utils/whatsapp");
  let whatsappNotificationCount = 0;
  const originalSendAiSensyMessage = whatsappUtil.sendAiSensyMessage;
  whatsappUtil.sendAiSensyMessage = async (...args) => {
    whatsappNotificationCount++;
    return { ok: true };
  };

  const capturedEvent = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_" + Date.now(),
          order_id: mockOrderId,
          amount: 1100,
          currency: "INR",
          status: "captured",
          method: "upi"
        }
      }
    }
  };

  await test("F29.1: First payment.captured event marks booking Paid and dispatches notification", async () => {
    whatsappNotificationCount = 0;
    const { req, res, url } = createSignedWebhookReq(capturedEvent);

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(whatsappNotificationCount, 1, "WhatsApp notification should be dispatched exactly once");

    // Verify booking state
    const all = await bookingModel.all();
    const updated = all.find(b => b.id === webhookBooking.id);
    assert.strictEqual(updated.status, "Confirmed", "Status should be Confirmed");
  });

  await test("F29.2: Repeat payment.captured event returns { ok: true, duplicate: true } and does NOT dispatch duplicate notification", async () => {
    whatsappNotificationCount = 0; // Reset counter
    const { req, res, url } = createSignedWebhookReq(capturedEvent);

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true, "Response ok should be true");
    assert.strictEqual(res.body.duplicate, true, "Response duplicate should be true for retry");
    assert.strictEqual(whatsappNotificationCount, 0, "WhatsApp notification must NOT be dispatched on duplicate webhook!");
  });

  await test("F29.3: Adversarial - Webhook with invalid signature is rejected with 400", async () => {
    const rawBody = JSON.stringify(capturedEvent);
    const { req, res, url } = createMockReqRes({
      method: "POST",
      url: "/api/payments/webhook",
      headers: {
        "x-razorpay-signature": "bogus_signature_hex",
        "content-type": "application/json"
      },
      rawBody: rawBody,
      body: capturedEvent
    });

    const handled = await handleApi(req, res, url);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, "Invalid signature.");
  });

  // Restore whatsapp handler
  whatsappUtil.sendAiSensyMessage = originalSendAiSensyMessage;

  // =========================================================================
  // 4. Admin Session Persistence & Logout (M2 Polish / F19)
  // =========================================================================
  console.log("\n--- Category 4: Admin Session Persistence and Logout ---");

  await test("F19.1: Admin API endpoints correctly authenticate using adminKey query param", async () => {
    // Valid key
    const { req: validReq, res: validRes, url: validUrl } = createMockReqRes({
      method: "GET",
      url: `/api/admin/bookings?key=${encodeURIComponent(ADMIN_PASSWORD)}`
    });
    const handledValid = await handleApi(validReq, validRes, validUrl);
    assert.strictEqual(handledValid, true);
    assert.strictEqual(validRes.statusCode, 200);
    assert.ok(Array.isArray(validRes.body), "Should return bookings array");

    // Invalid key
    const { req: invalidReq, res: invalidRes, url: invalidUrl } = createMockReqRes({
      method: "GET",
      url: "/api/admin/bookings?key=wrong_password"
    });
    const handledInvalid = await handleApi(invalidReq, invalidRes, invalidUrl);
    assert.strictEqual(handledInvalid, true);
    assert.strictEqual(invalidRes.statusCode, 401, "Invalid key must return 401 Unauthorized");
  });

  await test("F19.2: frontend/assets/js/admin.js syntax and session contract verification", async () => {
    const adminJsPath = path.join(__dirname, "../frontend/assets/js/admin.js");
    const code = fs.readFileSync(adminJsPath, "utf8");

    // 1. Session storage key read
    assert.ok(
      code.includes('sessionStorage.getItem("adminKey")'),
      "admin.js must initialize KEY from sessionStorage.getItem('adminKey')"
    );

    // 2. Session storage key write on successful login
    assert.ok(
      code.includes('sessionStorage.setItem("adminKey", KEY)'),
      "admin.js must save KEY to sessionStorage on successful login"
    );

    // 3. Session storage key purge on logout and error
    assert.ok(
      code.includes('sessionStorage.removeItem("adminKey")'),
      "admin.js must purge adminKey from sessionStorage on logout"
    );

    // 4. Logout handler binds to .user-info button or #adminLogout
    assert.ok(
      code.includes('document.querySelector(".user-info button")') || code.includes('adminLogout'),
      "admin.js must bind click listener to logout button"
    );

    // 5. doLogout resets state and unhides loginOverlay
    assert.ok(
      code.includes('overlay.classList.remove("hidden")'),
      "doLogout must unhide #loginOverlay"
    );
  });

  await test("F19.3: admin.html contains matching logout button element", async () => {
    const adminHtmlPath = path.join(__dirname, "../backend/admin.html");
    const html = fs.readFileSync(adminHtmlPath, "utf8");

    assert.ok(
      html.includes('class="user-info"') && html.includes("Logout"),
      "admin.html must contain .user-info container with Logout button"
    );
    assert.ok(
      html.includes('id="loginOverlay"'),
      "admin.html must contain #loginOverlay element"
    );
  });

  await test("F19.4: End-to-end simulated admin session lifecycle (init -> login -> persist -> reload -> logout)", async () => {
    // Simulated browser sessionStorage mock
    const mockSessionStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    };

    // Simulated DOM elements
    const mockElements = {
      loginOverlay: {
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        }
      },
      pw: { value: "" }
    };

    // --- STEP A: Initial visit (no saved key) ---
    let KEY = mockSessionStorage.getItem("adminKey") || "";
    assert.strictEqual(KEY, "", "Initially no adminKey in sessionStorage");
    assert.strictEqual(mockElements.loginOverlay.classList.contains("hidden"), false, "Login overlay initially visible");

    // --- STEP B: Successful login with correct password ---
    mockElements.pw.value = ADMIN_PASSWORD;
    KEY = mockElements.pw.value;

    // Simulate loadBookings() API check
    const { req: bReq, res: bRes, url: bUrl } = createMockReqRes({
      method: "GET",
      url: `/api/admin/bookings?key=${encodeURIComponent(KEY)}`
    });
    await handleApi(bReq, bRes, bUrl);
    const success = (bRes.statusCode === 200);
    assert.strictEqual(success, true, "Login check should succeed with valid password");

    if (success) {
      mockSessionStorage.setItem("adminKey", KEY);
      mockElements.loginOverlay.classList.add("hidden");
    }

    assert.strictEqual(mockSessionStorage.getItem("adminKey"), ADMIN_PASSWORD, "adminKey stored in sessionStorage");
    assert.strictEqual(mockElements.loginOverlay.classList.contains("hidden"), true, "Login overlay hidden");

    // --- STEP C: Page reload (auto-restore session) ---
    // Simulate re-running initialization on reload
    let restoredKEY = mockSessionStorage.getItem("adminKey") || "";
    assert.strictEqual(restoredKEY, ADMIN_PASSWORD, "Restored KEY matches saved password");

    const { req: reloadReq, res: reloadRes, url: reloadUrl } = createMockReqRes({
      method: "GET",
      url: `/api/admin/bookings?key=${encodeURIComponent(restoredKEY)}`
    });
    await handleApi(reloadReq, reloadRes, reloadUrl);
    assert.strictEqual(reloadRes.statusCode, 200, "Auto-restore authentication succeeded");

    mockElements.loginOverlay.classList.add("hidden");
    assert.strictEqual(mockElements.loginOverlay.classList.contains("hidden"), true, "Login overlay stays hidden across reload");

    // --- STEP D: Admin clicks Logout ---
    // Simulate doLogout()
    restoredKEY = "";
    mockSessionStorage.removeItem("adminKey");
    mockElements.pw.value = "";
    mockElements.loginOverlay.classList.remove("hidden");

    assert.strictEqual(mockSessionStorage.getItem("adminKey"), null, "adminKey must be removed from sessionStorage");
    assert.strictEqual(mockElements.pw.value, "", "Password field must be cleared");
    assert.strictEqual(mockElements.loginOverlay.classList.contains("hidden"), false, "Login overlay must be shown again");

    // --- STEP E: Subsequent reload after logout ---
    let postLogoutKEY = mockSessionStorage.getItem("adminKey") || "";
    assert.strictEqual(postLogoutKEY, "", "No session restored after logout");
    assert.strictEqual(mockElements.loginOverlay.classList.contains("hidden"), false, "Login overlay remains visible");
  });

  console.log("\n=========================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
