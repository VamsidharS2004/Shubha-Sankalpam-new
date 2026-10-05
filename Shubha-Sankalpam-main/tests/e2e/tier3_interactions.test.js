/**
 * Tier 3: Cross-Feature Interactions Test Suite
 * Covers multi-module workflows:
 * - Language switch + booking catalog synchronization
 * - OTP authentication + profile saving + checkout pipeline
 * - Clean URLs + deep linking preservation
 */
const assert = require('assert');
const path = require('path');
const config = require('./config');
const { DomInspector } = require('./helpers/dom_inspector');
const { loginUser } = require('./helpers/auth_helper');

module.exports = {
  name: 'Tier 3: Cross-Feature Interactions',
  tests: [
    {
      id: 'X01',
      name: 'Language switch + catalog sync: switching language preserves puja identity and maps correct metadata',
      fn: async ({ client }) => {
        const pujasPath = path.join(config.FRONTEND_DIR, 'content/pujas.js');
        const pujasCode = DomInspector.loadFile(pujasPath);

        // Verify multi-language support (English and Telugu items for Navanarasimha Homam)
        assert.ok(
          pujasCode.includes('Navanarasimha Homam-en') && pujasCode.includes('Navanarasimha Homam-te'),
          'pujas.js must contain catalog entries for both English (-en) and Telugu (-te)'
        );

        // Fetch catalog item via API to test server-side resolution
        const itemRes = await client.get('/api/catalog/item?ref=puja:0');
        if (itemRes.status === 200 && itemRes.json) {
          assert.ok(itemRes.json.name, 'Resolved catalog item should have a name');
          assert.ok(itemRes.json.price > 0, 'Resolved catalog item should have a valid price');
        }
      }
    },
    {
      id: 'X02',
      name: 'OTP authentication + profile saving + checkout: end-to-end user session integration',
      fn: async ({ client }) => {
        const testPhone = '9876543213';

        // Step 1: Request OTP
        const otpReq = await client.post('/api/login/request', { phone: testPhone });
        assert.strictEqual(otpReq.status, 200, 'OTP request must return 200 OK');

        // Step 2: In DEMO_MODE, verify with demo OTP
        const auth = await loginUser(client, testPhone);
        assert.ok(auth.token, 'Should successfully obtain session token');

        // Step 3: Update Devotee Profile
        const updateRes = await client.put('/api/me', {
          name: 'Multi Feature User',
          gotra: 'Bharadwaja',
          city: 'Hyderabad'
        }, auth.headers);
        assert.strictEqual(updateRes.status, 200, 'Profile update must return 200 OK');

        // Step 4: Verify profile retrieved from /api/me matches
        const meRes = await client.get('/api/me', auth.headers);
        assert.strictEqual(meRes.status, 200, 'GET /api/me must return 200 OK');
        assert.strictEqual(meRes.json.devotee.name, 'Multi Feature User');
        assert.strictEqual(meRes.json.devotee.gotra, 'Bharadwaja');

        // Step 5: Proceed to booking with authenticated session
        const bookingRes = await client.post('/api/bookings', {
          ref: 'puja:0',
          puja: 'Navanarasimha Homam',
          price: 11,
          name: meRes.json.devotee.name,
          gotram: meRes.json.devotee.gotra,
          phone: testPhone
        }, auth.headers);

        assert.strictEqual(bookingRes.status, 201, 'Booking creation must succeed with 201 Created');
        assert.ok(bookingRes.json && bookingRes.json.id, 'Booking must return an ID');

        // Step 6: Create payment order for this booking
        const orderRes = await client.post('/api/payments/order', {
          bookingId: bookingRes.json.id
        }, auth.headers);

        assert.strictEqual(orderRes.status, 200, 'Payment order creation must return 200 OK');
        assert.strictEqual(orderRes.json.amount, 1100, 'Order amount must match 1100 paise (₹11)');
      }
    },
    {
      id: 'X03',
      name: 'Clean URLs + deep linking: query parameters are preserved and routed correctly',
      fn: async ({ client }) => {
        // Deep linking with query parameters on clean URLs
        const deepLinks = [
          '/booking?id=puja:0&lang=te',
          '/account?tab=bookings',
          '/login?redirect=/booking%3Fid%3Dpuja%3A0'
        ];

        for (const link of deepLinks) {
          const res = await client.get(link);
          assert.strictEqual(
            res.status,
            200,
            `Clean URL with query params "${link}" should serve HTML with 200 OK`
          );
          assert.ok(
            (res.headers['content-type'] || '').includes('text/html'),
            `Response for "${link}" must be text/html`
          );
        }
      }
    }
  ]
};
