/**
 * Suite 02: Puja Booking (Navigation, Validation, Gotram Toggle, and Submission)
 */
const { createPage, safeType, safeClick, delay } = require('../helpers/browser');

module.exports = {
  name: '02_booking.test.js',
  tests: [
    {
      name: 'Form validation: requires devotee name and gotram',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          // Ensure authenticated session
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          // Navigate directly to booking form
          await page.goto(`${baseUrl}/booking.html?id=puja:0`, { waitUntil: 'networkidle0' });

          // Clear any auto-filled fields
          await page.evaluate(() => {
            document.getElementById('famName1').value = '';
            document.getElementById('fGotram').value = '';
            document.getElementById('noGotramCheck').checked = false;
          });

          // 1. Submit with empty devotee name
          page.clearDialogs();
          await safeClick(page, '#payBtn');
          const nameDialog = await page.waitForDialog(3000);

          assert.ok(nameDialog, 'Expected validation alert for empty devotee name');
          assert.includes(
            nameDialog.message.toLowerCase(),
            'devotee name',
            'Alert should mention devotee name'
          );

          // 2. Fill devotee name but leave gotram empty
          await safeType(page, '#famName1', 'Devotee Test Name');
          await page.evaluate(() => {
            document.getElementById('fGotram').value = '';
            document.getElementById('noGotramCheck').checked = false;
            document.getElementById('fGotram').disabled = false;
          });

          page.clearDialogs();
          await safeClick(page, '#payBtn');
          const gotramDialog = await page.waitForDialog(3000);

          assert.ok(gotramDialog, 'Expected validation alert for empty gotram');
          assert.includes(
            gotramDialog.message.toLowerCase(),
            'gotram',
            'Alert should mention gotram'
          );
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'UI interaction: "I don\'t know my gotra" checkbox auto-fills Kashyapa and disables input',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          await page.goto(`${baseUrl}/booking.html?id=puja:0`, { waitUntil: 'networkidle0' });

          // Uncheck initially if checked
          await page.evaluate(() => {
            const cb = document.getElementById('noGotramCheck');
            if (cb.checked) {
              cb.checked = false;
              cb.dispatchEvent(new Event('change'));
            }
          });

          // Check the box
          await safeClick(page, '#noGotramCheck');

          const stateChecked = await page.evaluate(() => {
            const input = document.getElementById('fGotram');
            return {
              value: input.value,
              disabled: input.disabled
            };
          });

          assert.strictEqual(
            stateChecked.value,
            'Kashyapa',
            'Checking gotram bypass should fill gotram with "Kashyapa"'
          );
          assert.strictEqual(
            stateChecked.disabled,
            true,
            'Checking gotram bypass should disable the gotram input'
          );

          // Uncheck the box
          await safeClick(page, '#noGotramCheck');

          const stateUnchecked = await page.evaluate(() => {
            const input = document.getElementById('fGotram');
            return {
              value: input.value,
              disabled: input.disabled
            };
          });

          assert.strictEqual(
            stateUnchecked.disabled,
            false,
            'Unchecking gotram bypass should re-enable the gotram input'
          );
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Happy path: Navigation from puja-details.html to booking.html and booking creation',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          // Intercept payment endpoints and external gateways to prevent live calls upon redirect to payment.html
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            const url = req.url();
            if (url.includes('/api/payments/config')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ razorpayEnabled: false, keyId: null })
              });
            } else if (url.includes('/api/payments/order')) {
              req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  orderId: 'order_mock_booking_02',
                  amount: 120100,
                  keyId: 'rzp_test_mock_key',
                  bookingId: 'demo'
                })
              });
            } else if (url.includes('checkout.razorpay.com') || url.includes('api.razorpay.com')) {
              req.respond({
                status: 200,
                contentType: 'application/javascript',
                body: '// Mocked checkout.js'
              });
            } else {
              req.continue();
            }
          });

          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('token', 'test_e2e_session_token_123');
          });

          // Step 1: Open puja-details.html
          await page.goto(`${baseUrl}/puja-details.html?id=puja:0`, { waitUntil: 'networkidle0' });

          const title = await page.$eval('#pdTitle', (el) => el.textContent.trim());
          assert.ok(title.length > 0, 'Puja details should render title');

          // Click Book Puja Now
          await safeClick(page, '#pdBook');

          // Step 2: Ensure navigation to booking.html
          await page.waitForFunction(() => location.href.includes('booking.html'), { timeout: 8000 });
          assert.ok(page.url().includes('booking.html'), 'Should navigate to booking.html');

          // Fill booking form fields
          await safeType(page, '#famName1', 'Sundar Pichai');
          await safeType(page, '#famName2', 'Anjali Pichai');
          await safeType(page, '#fGotram', 'Shandilya');
          await safeType(page, '#fPhone', '9876543210');
          await safeType(page, '#fSankalpam', 'Wellbeing, peace, and good health for family');

          // Check sidebar summary price
          const price = await page.$eval('#bkTotalFinal', (el) => el.textContent.trim());
          assert.includes(price, '₹', 'Sidebar should display formatted rupee price');

          // Step 3: Submit booking
          page.clearDialogs();
          await safeClick(page, '#payBtn');

          // Wait for redirection to payment.html
          await page.waitForFunction(
            () => location.href.includes('payment.html') && location.search.includes('bookingId='),
            { timeout: 10000 }
          );

          assert.ok(
            page.url().includes('payment.html') && page.url().includes('bookingId='),
            'Submitting booking should redirect to payment.html with bookingId'
          );
        } finally {
          await page.close();
        }
      }
    }
  ]
};
