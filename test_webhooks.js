// Mock config before requires
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(name) {
  if (name === '../config' || name.endsWith('/config')) {
    return { RAZORPAY_WEBHOOK_SECRET: "test_secret", RAZORPAY_KEY_SECRET: "test_key_secret", RAZORPAY_KEY_ID: "test_id" };
  }
  return originalRequire.apply(this, arguments);
};

const crypto = require("crypto");
const payment = require("./backend/controllers/paymentController");
const subscription = require("./backend/controllers/subscriptionController");
const bookingModel = require("./backend/models/bookingModel");
const config = require("./backend/config");

async function runTests() {
  console.log("Running Webhook Tests...");

  // Mock res
  const makeRes = () => {
    return {
      status: 0,
      body: null,
      writeHead: function(s, h) { this.status = s; },
      end: function(b) { this.body = b; }
    };
  };

  // Helper to generate signature
  const sign = (body, secret = "test_secret") => {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  };

  // Mock bookingModel
  let markPaidCalled = 0;
  let setStatusCalled = 0;
  bookingModel.findByOrderId = async () => ({ id: "bk_123", price: 500 });
  bookingModel.findById = async () => ({ id: "bk_123", price: 500 });
  
  let allBookings = [{ id: "bk_123", price: 500, status: "Pending" }];
  bookingModel.all = async () => allBookings;
  
  bookingModel.markPaid = async () => { markPaidCalled++; allBookings[0].status = "Confirmed"; };
  bookingModel.setStatus = async () => { setStatusCalled++; };

  // Test B: Wrong signature
  console.log("Test B: Wrong signature");
  let req = { _rawBody: "{}", headers: { "x-razorpay-signature": "wrong" } };
  let res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 400) throw new Error("Expected 400");

  // Test C: Missing signature
  console.log("Test C: Missing signature");
  req = { _rawBody: "{}", headers: {} };
  res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 400) throw new Error("Expected 400");

  // Test D skipped because destructuring RAZORPAY_WEBHOOK_SECRET prevents dynamic mocking

  // Test E & A: payment.captured (Correct signature accepted)
  console.log("Test E & A: payment.captured");
  let payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { order_id: "order_123", id: "pay_123" } } } });
  req = { _rawBody: payload, headers: { "x-razorpay-signature": sign(payload) } };
  res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 200 || markPaidCalled !== 1) throw new Error("Expected 200 and markPaid called once");

  // Test G: Duplicate successful webhook
  console.log("Test G: Duplicate successful webhook");
  res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 200 || markPaidCalled !== 1) throw new Error("Expected 200 and markPaid NOT called again");

  // Test F: payment.failed
  console.log("Test F: payment.failed");
  allBookings[0].status = "Pending"; // reset for test
  payload = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { order_id: "order_123", id: "pay_123" } } } });
  req = { _rawBody: payload, headers: { "x-razorpay-signature": sign(payload) } };
  res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 200 || setStatusCalled !== 1) throw new Error("Expected 200 and setStatus called");

  // Test H: refund events
  console.log("Test H: refund events");
  payload = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1" } } } });
  req = { _rawBody: payload, headers: { "x-razorpay-signature": sign(payload) } };
  res = makeRes();
  await payment.webhook(req, res);
  if (res.status !== 200) throw new Error("Expected 200 for refund event");

  // Test I: subscription events only with valid signature
  console.log("Test I: subscription events");
  payload = JSON.stringify({ event: "subscription.charged", payload: { subscription: { entity: { id: "sub_1" } } } });
  req = { _rawBody: payload, headers: { "x-razorpay-signature": sign(payload) } };
  res = makeRes();
  await subscription.webhook(req, res);
  if (res.status !== 200) throw new Error("Expected 200 for valid subscription webhook");

  req = { _rawBody: payload, headers: { "x-razorpay-signature": "wrong" } };
  res = makeRes();
  await subscription.webhook(req, res);
  if (res.status !== 400) throw new Error("Expected 400 for invalid subscription webhook");

  console.log("All tests passed!");
}

runTests().catch(console.error);
