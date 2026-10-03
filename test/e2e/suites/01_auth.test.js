/**
 * Suite 01: Authentication & OTP (Happy Paths and Error Handling)
 */
const { createPage, safeType, safeClick, delay } = require('../helpers/browser');

module.exports = {
  name: '01_auth.test.js',
  tests: [
    {
      name: 'Form validation: rejects short phone number (< 10 digits)',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => localStorage.clear());

          // Input 5-digit invalid phone
          await safeType(page, '#loginPhone', '12345');
          page.clearDialogs();

          await safeClick(page, '#sendOtpBtn');
          const dialog = await page.waitForDialog(3000);

          assert.ok(dialog, 'Expected a validation dialog alert for short phone');
          assert.includes(
            dialog.message,
            'Please enter a valid phone number',
            'Dialog message should ask for valid phone number'
          );

          // Ensure step did not transition
          const phoneStepVisible = await page.$eval('#phoneStep', (el) => !el.classList.contains('hidden'));
          assert.ok(phoneStepVisible, 'Phone step should remain visible after validation failure');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Happy path & Error handling: OTP request and invalid OTP rejection',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => localStorage.clear());

          // Step 1: Request OTP with valid phone
          const testPhone = '9876543210';
          await safeType(page, '#loginPhone', testPhone);
          page.clearDialogs();

          await safeClick(page, '#sendOtpBtn');

          // Wait for OTP step to appear
          await page.waitForSelector('#otpStep:not(.hidden)', { timeout: 8000 });
          const stepTitle = await page.$eval('#loginStepTitle', (el) => el.textContent.trim());
          assert.strictEqual(stepTitle, 'Enter the OTP', 'Title should update to "Enter the OTP"');

          // Step 2: Test Invalid OTP entry
          await safeType(page, '#loginOtp', '0000');
          page.clearDialogs();

          await safeClick(page, '#verifyOtpBtn');
          const errDialog = await page.waitForDialog(4000);

          assert.ok(errDialog, 'Expected an error dialog alert for wrong OTP');
          assert.includes(
            errDialog.message.toLowerCase(),
            'wrong otp',
            'Error dialog should indicate wrong OTP'
          );
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Happy path: MSG91 / Demo OTP login, profile handling, and redirect',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => localStorage.clear());

          const testPhone = '9123456789';
          await safeType(page, '#loginPhone', testPhone);
          await safeClick(page, '#sendOtpBtn');

          await page.waitForSelector('#otpStep:not(.hidden)', { timeout: 8000 });

          // Wait for demo OTP to appear in #demoOtp
          await page.waitForFunction(
            () => {
              const demoEl = document.getElementById('demoOtp');
              return demoEl && /\d{4}/.test(demoEl.textContent || '');
            },
            { timeout: 8000 }
          );

          const demoText = await page.$eval('#demoOtp', (el) => el.textContent || '');
          const match = demoText.match(/\d{4}/);
          const otp = match ? match[0] : null;

          assert.ok(otp, 'Expected demo OTP to be generated and available for verification');

          await safeType(page, '#loginOtp', otp);
          page.clearDialogs();
          await safeClick(page, '#verifyOtpBtn');

          // Check if profile step appears or directly redirects
          await page.waitForFunction(
            () => {
              const profileStep = document.getElementById('profileStep');
              const isProfile = profileStep && !profileStep.classList.contains('hidden');
              const token = localStorage.getItem('token');
              return isProfile || !!token;
            },
            { timeout: 8000 }
          );

          const isProfileStep = await page.evaluate(() => {
            const el = document.getElementById('profileStep');
            return el && !el.classList.contains('hidden');
          });

          if (isProfileStep) {
            await safeType(page, '#loginName', 'Devotee E2E');
            await safeType(page, '#loginGotram', 'Kashyapa');
            await safeClick(page, '#saveProfileBtn');
          }

          // Wait for token in localStorage
          await page.waitForFunction(() => !!localStorage.getItem('token'), { timeout: 6000 });
          const token = await page.evaluate(() => localStorage.getItem('token'));
          assert.ok(token && token.length > 10, 'Bearer token should be saved in localStorage');
        } finally {
          await page.close();
        }
      }
    }
  ]
};
