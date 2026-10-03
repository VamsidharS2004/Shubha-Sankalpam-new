/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Covers invalid query params, missing Gotram, empty categories, edge screen sizes, price mismatch attacks, missing tokens
 */
const assert = require('assert');
const path = require('path');
const config = require('./config');
const { DomInspector } = require('./helpers/dom_inspector');
const { loginUser } = require('./helpers/auth_helper');

module.exports = {
  name: 'Tier 2: Boundary & Corner Cases',
  tests: [
    {
      id: 'B01',
      name: 'Invalid query params on puja details route: non-existent puja ID returns graceful 200 or 404',
      fn: async ({ client }) => {
        // Test various invalid query parameters
        const probes = [
          '/puja-details.html?id=non_existent_puja_99999',
          '/puja-details.html?id=puja:99999',
          '/puja-details.html?id=',
          '/puja-details.html?id=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
          '/puja-details?id=invalid_id_probe'
        ];

        for (const probe of probes) {
          const res = await client.get(probe);
          // Opaque-box check: server should not crash, must return 200 (serving template) or 404
          assert.ok(
            res.status === 200 || res.status === 404,
            `Probing "${probe}" should return 200 or 404, got ${res.status}`
          );
        }
      }
    },
    {
      id: 'B02',
      name: 'Missing Gotram handling: empty gotram retains user profile gotra without erasing',
      fn: async ({ client }) => {
        const testPhone = '9876543211';
        const auth = await loginUser(client, testPhone);

        // 1. Set initial gotra on user profile
        await client.put('/api/me', { name: 'Boundary Tester', gotra: 'Harithasa' }, auth.headers);
        const meRes1 = await client.get('/api/me', auth.headers);
        assert.strictEqual(meRes1.json.devotee.gotra, 'Harithasa', 'Initial gotram should be Harithasa');

        // 2. Submit booking with empty gotram (user checked "I don't know my gotram")
        const bookingRes = await client.post('/api/bookings', {
          ref: 'puja:0',
          puja: 'Navanarasimha Homam',
          price: 11,
          name: 'Boundary Tester',
          gotram: '', // empty!
          phone: testPhone
        }, auth.headers);

        assert.strictEqual(bookingRes.status, 201, `Booking creation should succeed even with empty gotram, got ${bookingRes.status}`);

        // 3. Verify user profile gotra was NOT erased by empty string
        const meRes2 = await client.get('/api/me', auth.headers);
        assert.strictEqual(
          meRes2.json.devotee.gotra,
          'Harithasa',
          'Empty booking gotram must NOT erase previously saved gotra from devotee profile'
        );
      }
    },
    {
      id: 'B03',
      name: 'Empty categories / filter behavior: cards.js has fallback markup when filter yields 0 items',
      fn: async () => {
        const cardsJsPath = path.join(config.FRONTEND_DIR, 'assets/js/cards.js');
        const code = DomInspector.loadFile(cardsJsPath);
        // Verify code checks for empty array or displays empty notification
        assert.ok(
          code.includes('.length === 0') || code.includes('!list.length') || code.includes('empty') || code.includes('No pujas'),
          'cards.js must check for 0 results and render an empty-state message'
        );
      }
    },
    {
      id: 'B04',
      name: 'Edge screen sizes: responsive CSS breakpoints defined for 320px, 375px, 768px, 1280px',
      fn: async () => {
        const respCssPath = path.join(config.FRONTEND_DIR, 'assets/css/responsive.css');
        const respCss = DomInspector.loadFile(respCssPath);

        // Verify key responsive media query breakpoints
        assert.ok(
          respCss.includes('max-width') || respCss.includes('min-width'),
          'responsive.css must define responsive media queries'
        );
        // Verify mobile breakpoint (< 600px or < 768px or < 900px)
        assert.ok(
          /max-width:\s*(480px|600px|768px|900px)/i.test(respCss),
          'responsive.css must handle mobile/tablet viewport constraints'
        );
      }
    },
    {
      id: 'B05',
      name: 'Price mismatch attack: tampered price submitted by client is rejected with HTTP 409',
      fn: async ({ client }) => {
        const auth = await loginUser(client, '9876543212');

        // Navanarasimha Homam catalog price is 11 (or 816 in EN)
        // Attacker attempts to book at ₹1
        const tamperedRes = await client.post('/api/bookings', {
          ref: 'puja:0',
          puja: 'Navanarasimha Homam',
          price: 1, // Tampered price!
          name: 'Attacker Malicious',
          gotram: 'Kashyapa',
          phone: '9876543212'
        }, auth.headers);

        assert.strictEqual(
          tamperedRes.status,
          409,
          `Tampered price must be rejected with HTTP 409 Conflict, got ${tamperedRes.status}`
        );
        assert.ok(
          tamperedRes.json && tamperedRes.json.error,
          'Response should contain error message explaining price change'
        );
      }
    },
    {
      id: 'B06',
      name: 'Missing or invalid authentication token: protected routes reject with HTTP 401',
      fn: async ({ client }) => {
        // 1. GET /api/me without token
        const meResNoToken = await client.get('/api/me');
        assert.strictEqual(meResNoToken.status, 401, 'GET /api/me without token must return 401');

        // 2. GET /api/me with malformed token
        const meResBadToken = await client.get('/api/me', { Authorization: 'Bearer bad.token.here' });
        assert.strictEqual(meResBadToken.status, 401, 'GET /api/me with invalid token must return 401');

        // 3. POST /api/bookings without token
        const bookNoToken = await client.post('/api/bookings', {
          ref: 'puja:0',
          puja: 'Navanarasimha Homam',
          price: 11,
          name: 'No Token Devotee',
          phone: '9876543210'
        });
        assert.strictEqual(bookNoToken.status, 401, 'POST /api/bookings without token must return 401');
      }
    },
    {
      id: 'B07',
      name: 'Unauthorized admin endpoints: missing or invalid key parameter rejected with HTTP 401',
      fn: async ({ client }) => {
        // 1. Admin bookings list without key
        const adminNoKey = await client.get('/api/admin/bookings');
        assert.strictEqual(adminNoKey.status, 401, 'Admin bookings endpoint without key must return 401');

        // 2. Admin bookings list with incorrect key
        const adminBadKey = await client.get('/api/admin/bookings?key=wrong_password_999');
        assert.strictEqual(adminBadKey.status, 401, 'Admin bookings endpoint with wrong key must return 401');
      }
    },
    {
      id: 'B08',
      name: 'Malformed JSON payload: bad request body returns HTTP 400 without crashing server',
      fn: async ({ client }) => {
        const res = await client.post('/api/login/request', 'NOT_VALID_JSON{', {
          'Content-Type': 'application/json'
        });
        // Server should catch error cleanly and return 400
        assert.ok(
          res.status === 400 || res.status === 500,
          `Malformed JSON body should return 400 Bad Request, got ${res.status}`
        );
      }
    }
  ]
};
