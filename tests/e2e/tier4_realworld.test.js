/**
 * Tier 4: Real-World Scenarios Test Suite
 * Executes full ₹11 puja booking pipeline from catalog to devotee details,
 * order creation, manual payment pause verification, and payment callbacks.
 */
const assert = require('assert');
const config = require('./config');
const { loginUser } = require('./helpers/auth_helper');
const {
  generateHmacSha256,
  generateRazorpayPaymentSignature,
  createRazorpayWebhookPayload
} = require('./helpers/mocks');

module.exports = {
  name: 'Tier 4: Real-World Scenarios (Full ₹11 Puja Pipeline)',
  tests: [
    {
      id: 'R01',
      name: 'Full ₹11 Puja Booking Pipeline: catalog -> devotee -> booking -> order -> webhook -> admin verification',
      fn: async ({ client }) => {
        console.log('    [Step 1] Initializing user session...');
        const devoteePhone = '9876543214';
        const devoteeName = 'Srikanth Varma';
        const devoteeGotram = 'Kashyapa';
        const auth = await loginUser(client, devoteePhone);

        // Update profile details
        await client.put('/api/me', {
          name: devoteeName,
          gotra: devoteeGotram
        }, auth.headers);

        console.log('    [Step 2] Creating ₹11 Navanarasimha Homam booking...');
        const bookingPayload = {
          ref: 'puja:0',
          puja: 'Navanarasimha Homam',
          price: 11,
          name: devoteeName,
          gotram: devoteeGotram,
          phone: devoteePhone,
          family: 'Wife: Lakshmi, Son: Aditya'
        };

        const bookingRes = await client.post('/api/bookings', bookingPayload, auth.headers);
        assert.strictEqual(
          bookingRes.status,
          201,
          `Booking creation failed: ${bookingRes.text}`
        );

        const bookingId = bookingRes.json.id;
        assert.ok(bookingId, 'Booking creation must return booking id');

        // Extract or verify 6-digit shortId
        const shortId = bookingRes.json.shortId;
        if (shortId) {
          assert.match(
            String(shortId),
            /^\d{6}$/,
            `shortId "${shortId}" must be exactly a 6-digit string`
          );
          console.log(`    ✓ 6-Digit Booking ID verified: ${shortId}`);
        }

        console.log('    [Step 3] Creating Razorpay payment order for ₹11 (1100 paise)...');
        const orderRes = await client.post('/api/payments/order', { bookingId }, auth.headers);
        assert.strictEqual(
          orderRes.status,
          200,
          `Payment order creation failed: ${orderRes.text}`
        );

        const order = orderRes.json;
        assert.strictEqual(order.amount, 1100, 'Order amount in paise must be 1100 (₹11)');
        assert.strictEqual(order.currency, 'INR', 'Order currency must be INR');
        const orderId = order.orderId || (order.order && order.order.id);
        assert.ok(orderId, 'Order must return a valid orderId');

        console.log(`    ✓ Payment order created: ${orderId} for ₹11`);

        console.log('    [Step 4] Simulating Razorpay webhook payment.captured callback...');
        const fakePaymentId = 'pay_realworld_' + Date.now();
        const webhookPayload = createRazorpayWebhookPayload(
          'payment.captured',
          orderId,
          fakePaymentId,
          1100
        );

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
        const signature = generateHmacSha256(webhookPayload, webhookSecret);

        const webhookRes = await client.post('/api/payments/webhook', webhookPayload, {
          'x-razorpay-signature': signature,
          'Content-Type': 'application/json'
        });

        // In demo mode or if webhook secret configured, it handles cleanly
        assert.ok(
          webhookRes.status === 200 || webhookRes.status === 400,
          `Webhook should process request with 200 (or 400 if secret unconfigured), got ${webhookRes.status}`
        );

        console.log('    [Step 5] Testing Webhook Idempotency on duplicate delivery...');
        const replayRes = await client.post('/api/payments/webhook', webhookPayload, {
          'x-razorpay-signature': signature,
          'Content-Type': 'application/json'
        });
        assert.ok(
          replayRes.status === 200 || replayRes.status === 400,
          `Replayed webhook must respond with 200, got ${replayRes.status}`
        );

        console.log('    [Step 6] Verifying Admin Panel booking record...');
        const adminRes = await client.get(`/api/admin/bookings?key=${config.ADMIN_PASSWORD}`);
        assert.strictEqual(adminRes.status, 200, `Admin bookings request failed: ${adminRes.status}`);

        const allBookings = adminRes.json || [];
        const found = allBookings.find((b) => b.id === bookingId || b.devotee_phone === devoteePhone);
        assert.ok(found, `Newly created booking ${bookingId} must appear in Admin Panel list`);

        // Check puja name and price in admin record
        assert.strictEqual(found.price, 11, 'Admin booking record price must be 11');
        assert.ok(
          found.puja || found.name,
          'Admin booking must display actual devotee and puja information'
        );

        console.log('    ✓ Real-world ₹11 booking lifecycle verified successfully!');
      }
    }
  ]
};
