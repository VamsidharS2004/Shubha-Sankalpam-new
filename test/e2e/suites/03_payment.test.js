/**
 * Suite 03: Payment Checkout, Verification, Fallbacks, and Failure Handling
 */
const { createPage, safeClick, delay } = require('../helpers/browser');
const { injectRazorpayMock } = require('../helpers/mocks');

module.exports = {
  name: '03_payment.test.js',
  tests: [
    {
      name: 'Happy path: UPI QR fallback payment claim',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          // Create a mock/real booking via API first
          const bookingId = await page.evaluate(async () => {
            const res = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puja: 'Maha Rudrabhishekam',
                price: 1201,
                name: 'Devotee QR Test',
                phone: '9876543210',
                gotram: 'Kashyapa',
                family: 'Devotee QR Test'
              })
            });
            const data = await res.json();
            return data.id;
          });

          assert.ok(bookingId, 'Expected valid bookingId returned from API');

          // Intercept /api/payments/config to test QR Flow
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            if (req.url().includes('/api/payments/config')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ razorpayEnabled: false, keyId: null })
              });
            } else {
              req.continue();
            }
          });

          // Navigate to payment page in QR mode
          await page.goto(`${baseUrl}/payment.html?bookingId=${bookingId}&id=puja:0`, {
            waitUntil: 'networkidle0'
          });

          // Verify QR UI elements
          const payBtnText = await page.$eval('#paidBtn', (el) => el.textContent.trim());
          assert.includes(
            payBtnText,
            'completed the payment',
            'Button should state "I have completed the payment"'
          );

          // Click payment completed claim
          page.clearDialogs();
          await safeClick(page, '#paidBtn');

          // Verify success display
          await page.waitForFunction(() => {
            const el = document.getElementById('paySuccess');
            return el && el.style.display === 'block';
          });

          const successVisible = await page.$eval('#paySuccess', (el) => el.style.display === 'block');
          assert.strictEqual(successVisible, true, '#paySuccess banner should be displayed');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Happy path: Razorpay Checkout modal & verification confirmation',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          const bookingId = await page.evaluate(async () => {
            const res = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puja: 'Rudra Abhishekam',
                price: 1500,
                name: 'Devotee Razorpay Test',
                phone: '9876543210',
                gotram: 'Bharadwaja',
                family: 'Devotee Razorpay Test'
              })
            });
            const data = await res.json();
            return data.id;
          });

          assert.ok(bookingId, 'Expected bookingId from booking creation');

          // Inject safe Razorpay mock
          await injectRazorpayMock(page, {
            autoComplete: true,
            signature: 'test_signature_valid'
          });

          // Intercept API routes for safe Razorpay mode
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            const url = req.url();
            if (url.includes('/api/payments/config')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ razorpayEnabled: true, keyId: 'rzp_test_mock_key' })
              });
            } else if (url.includes('/api/payments/order')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  orderId: 'order_mock_test_123',
                  amount: 150000,
                  keyId: 'rzp_test_mock_key',
                  bookingId
                })
              });
            } else if (url.includes('/api/payments/verify')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
              });
            } else if (url.includes('checkout.razorpay.com')) {
              req.respond({
                status: 200,
                contentType: 'application/javascript',
                body: '// Mocked checkout.js'
              });
            } else {
              req.continue();
            }
          });

          await page.goto(`${baseUrl}/payment.html?bookingId=${bookingId}&id=puja:0`, {
            waitUntil: 'networkidle0'
          });

          // Wait for Razorpay mode UI
          await page.waitForFunction(() => {
            const btn = document.getElementById('paidBtn');
            return btn && btn.textContent.includes('Pay Now');
          });

          const btnText = await page.$eval('#paidBtn', (el) => el.textContent.trim());
          assert.strictEqual(btnText, 'Pay Now', 'Button should read "Pay Now" in Razorpay mode');

          // Trigger checkout
          page.clearDialogs();
          await safeClick(page, '#paidBtn');

          // Verify success screen displayed
          await page.waitForFunction(() => {
            const el = document.getElementById('paySuccess');
            return el && el.style.display === 'block';
          });

          const successText = await page.$eval('#paySuccess', (el) => el.textContent);
          assert.includes(
            successText,
            'Successfully joined',
            'Success card should indicate successful booking joining'
          );
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Error handling: Failed payment verification alert and handling',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          const bookingId = 'bk_failed_test_' + Date.now();

          // Inject safe Razorpay mock
          await injectRazorpayMock(page, {
            autoComplete: true,
            signature: 'invalid_signature_mock'
          });

          await page.setRequestInterception(true);
          page.on('request', (req) => {
            const url = req.url();
            if (url.includes('/api/payments/config')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ razorpayEnabled: true, keyId: 'rzp_test_mock_key' })
              });
            } else if (url.includes('/api/payments/order')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  orderId: 'order_mock_test_failed',
                  amount: 150000,
                  keyId: 'rzp_test_mock_key',
                  bookingId
                })
              });
            } else if (url.includes('/api/payments/verify')) {
              // Simulate backend verification failure
              req.respond({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Invalid signature' })
              });
            } else if (url.includes('checkout.razorpay.com')) {
              req.respond({
                status: 200,
                contentType: 'application/javascript',
                body: '// Mocked checkout.js'
              });
            } else {
              req.continue();
            }
          });

          await page.goto(`${baseUrl}/payment.html?bookingId=${bookingId}&id=puja:0`, {
            waitUntil: 'networkidle0'
          });

          await page.waitForFunction(() => {
            const btn = document.getElementById('paidBtn');
            return btn && btn.textContent.includes('Pay Now');
          });

          page.clearDialogs();
          await safeClick(page, '#paidBtn');

          const failureDialog = await page.waitForDialog(4000);
          assert.ok(failureDialog, 'Expected error alert on payment verification failure');
          assert.includes(
            failureDialog.message.toLowerCase(),
            'payment verification failed',
            'Dialog alert should indicate payment verification failure'
          );
        } finally {
          await page.close();
        }
      }
    }
  ]
};
