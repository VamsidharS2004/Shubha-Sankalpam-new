/**
 * Suite 06: Admin Dashboard (Authentication, Navigation, Bookings View, Search & Filter)
 */
const { createPage, safeType, safeClick, delay } = require('../helpers/browser');
const config = require('../config');

module.exports = {
  name: '06_admin.test.js',
  tests: [
    {
      name: 'Admin auth error handling: rejects incorrect password',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle0' });

          // Ensure login overlay is visible
          const overlayVisible = await page.$eval('#loginOverlay', (el) =>
            !el.classList.contains('hidden')
          );
          assert.strictEqual(overlayVisible, true, 'Admin login overlay should initially be visible');

          // Submit wrong password
          await safeType(page, '#pw', 'wrong_admin_password_999');
          page.clearDialogs();

          await safeClick(page, '#loginBtn');
          const dialog = await page.waitForDialog(4000);

          assert.ok(dialog, 'Expected an alert for incorrect password');
          assert.includes(
            dialog.message.toLowerCase(),
            'wrong password',
            'Alert should mention "Wrong password"'
          );

          // Overlay should remain visible
          const stillVisible = await page.$eval('#loginOverlay', (el) =>
            !el.classList.contains('hidden')
          );
          assert.strictEqual(stillVisible, true, 'Login overlay must stay visible on failed login');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Admin auth happy path: logs in successfully with ADMIN_PASSWORD',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle0' });

          // Fill valid admin password
          await safeType(page, '#pw', config.ADMIN_PASSWORD);
          page.clearDialogs();

          await safeClick(page, '#loginBtn');

          // Wait for #loginOverlay to gain .hidden class
          await page.waitForSelector('#loginOverlay.hidden', { timeout: 8000 });
          const isHidden = await page.$eval('#loginOverlay', (el) => el.classList.contains('hidden'));
          assert.strictEqual(isHidden, true, 'Login overlay should be dismissed with .hidden');

          // Default tab should be view-dashboard
          const dashboardActive = await page.$eval('#view-dashboard', (el) =>
            el.classList.contains('active')
          );
          assert.strictEqual(dashboardActive, true, 'Default view should be dashboard');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Admin navigation & Bookings table view rendering',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle0' });

          await safeType(page, '#pw', config.ADMIN_PASSWORD);
          await safeClick(page, '#loginBtn');
          await page.waitForSelector('#loginOverlay.hidden', { timeout: 8000 });

          // Navigate to Bookings view
          await safeClick(page, 'button.nav-link[data-target="view-bookings"]');
          await page.waitForSelector('#view-bookings.active', { timeout: 5000 });

          const bookingsActive = await page.$eval('#view-bookings', (el) =>
            el.classList.contains('active')
          );
          assert.strictEqual(bookingsActive, true, 'View bookings section should be active');

          // Check bookings table elements
          const hasCountSpan = await page.$eval('#bookingCountSpan', (el) => !!el.textContent);
          assert.strictEqual(hasCountSpan, true, 'Booking count span should be populated');

          // Verify either table or empty state is displayed cleanly
          const tableVisible = await page.$eval('#bookingsTbody', (el) => !!el);
          assert.strictEqual(tableVisible, true, 'Bookings tbody should be rendered in DOM');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Admin Bookings: search filtering by devotee name / phone / ID',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle0' });

          await safeType(page, '#pw', config.ADMIN_PASSWORD);
          await safeClick(page, '#loginBtn');
          await page.waitForSelector('#loginOverlay.hidden', { timeout: 8000 });

          await safeClick(page, 'button.nav-link[data-target="view-bookings"]');
          await page.waitForSelector('#view-bookings.active', { timeout: 5000 });

          // Set test fixture for deterministic search testing
          await page.evaluate(() => {
            window.allBookings = [
              {
                id: 'bk_demo_001',
                name: 'Srinivasa Ramanujan',
                phone: '9848012345',
                puja: 'Rudra Abhishekam',
                price: 1500,
                createdAt: new Date().toISOString(),
                status: 'confirmed'
              },
              {
                id: 'bk_demo_002',
                name: 'Aryabhata Sharma',
                phone: '9848054321',
                puja: 'Navagraha Shanti Homam',
                price: 2500,
                createdAt: new Date().toISOString(),
                status: 'scheduled'
              }
            ];
            if (typeof renderBookings === 'function') renderBookings();
          });

          // Test search query
          const searchSelector = '#view-bookings .search-bar input';
          await safeType(page, searchSelector, 'Ramanujan');
          await page.evaluate((sel) => {
            document.querySelector(sel).dispatchEvent(new Event('input', { bubbles: true }));
          }, searchSelector);
          await delay(200);

          // Assert count and matching rows
          const countText = await page.$eval('#bookingCountSpan', (el) => el.textContent.trim());
          assert.includes(countText, '1 booking', 'Search query "Ramanujan" should filter to 1 booking');

          const firstRowText = await page.$eval('#bookingsTbody', (el) => el.textContent);
          assert.includes(firstRowText, 'Ramanujan', 'Table should display Ramanujan row');
          assert.ok(!firstRowText.includes('Aryabhata'), 'Non-matching row should not appear');

          // Clear search
          await safeType(page, searchSelector, '');
          await page.evaluate((sel) => {
            document.querySelector(sel).dispatchEvent(new Event('input', { bubbles: true }));
          }, searchSelector);
          await delay(200);

          const restoredCount = await page.$eval('#bookingCountSpan', (el) => el.textContent.trim());
          assert.includes(restoredCount, '2 bookings', 'Clearing search should restore all bookings');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Admin Bookings: status filtering (Confirmed, Scheduled, All)',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle0' });

          await safeType(page, '#pw', config.ADMIN_PASSWORD);
          await safeClick(page, '#loginBtn');
          await page.waitForSelector('#loginOverlay.hidden', { timeout: 8000 });

          await safeClick(page, 'button.nav-link[data-target="view-bookings"]');
          await page.waitForSelector('#view-bookings.active', { timeout: 5000 });

          // Ensure test bookings
          await page.evaluate(() => {
            window.allBookings = [
              {
                id: 'bk_status_01',
                name: 'Devotee Confirmed',
                phone: '9999911111',
                puja: 'Chandi Homam',
                price: 5000,
                createdAt: new Date().toISOString(),
                status: 'confirmed'
              },
              {
                id: 'bk_status_02',
                name: 'Devotee Scheduled',
                phone: '9999922222',
                puja: 'Mrityunjaya Homam',
                price: 3500,
                createdAt: new Date().toISOString(),
                status: 'scheduled'
              }
            ];
            if (typeof renderBookings === 'function') renderBookings();
          });

          // Click "Confirmed" filter button
          await safeClick(page, '#view-bookings .filters .filter-btn:nth-child(2)');
          await delay(200);

          const confirmedCount = await page.$eval('#bookingCountSpan', (el) => el.textContent.trim());
          assert.includes(
            confirmedCount,
            '1 booking',
            'Confirmed filter should show only confirmed bookings'
          );
          const confirmedRowCount = await page.$$eval('#bookingsTbody tr', (rows) => rows.length);
          assert.strictEqual(confirmedRowCount, 1, 'Table should render exactly 1 row for confirmed filter');
          const confirmedRowText = await page.$eval('#bookingsTbody', (el) => el.textContent);
          assert.includes(confirmedRowText, 'Devotee Confirmed', 'Table must show confirmed booking');
          assert.ok(!confirmedRowText.includes('Devotee Scheduled'), 'Table must not show scheduled booking');

          // Click "All" filter button
          await safeClick(page, '#view-bookings .filters .filter-btn:nth-child(1)');
          await delay(200);

          const allCount = await page.$eval('#bookingCountSpan', (el) => el.textContent.trim());
          assert.includes(allCount, '2 bookings', '"All" filter should restore full bookings list');
          const allRowCount = await page.$$eval('#bookingsTbody tr', (rows) => rows.length);
          assert.strictEqual(allRowCount, 2, 'Table should render all 2 rows when All is active');
          const allRowText = await page.$eval('#bookingsTbody', (el) => el.textContent);
          assert.includes(allRowText, 'Devotee Confirmed', 'Table must show confirmed booking');
          assert.includes(allRowText, 'Devotee Scheduled', 'Table must show scheduled booking');
        } finally {
          await page.close();
        }
      }
    }
  ]
};
