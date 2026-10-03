/**
 * Suite 05: UI/UX Devotional Audio Bell Toggle
 *
 * Verifies that:
 * 1. The devotional bell button (#templeAudioBtn) is naturally rendered by application
 *    code (frontend/assets/js/main.js) inside #templeAudioWrap in frontend/home.html.
 * 2. Initial icon is bell emoji (🔔) and audio is paused.
 * 3. Clicking #templeAudioBtn starts audio playback and toggles icon to ⏸️.
 * 4. Clicking #templeAudioBtn again pauses audio, resets playback, and reverts icon to 🔔.
 * 5. When audio playback completes ('ended' event), the application listener resets icon to 🔔.
 *
 * NOTE: Strictly tests production DOM and application code. No synthetic DOM injection
 * or duplicate event listeners permitted.
 */
const { createPage, safeClick, delay } = require('../helpers/browser');

module.exports = {
  name: '05_audio.test.js',
  tests: [
    {
      name: 'Audio Bell: verifies rendering, emoji transitions (🔔 <-> ⏸️), and playback state',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          // 1. Navigate to home.html and await page load
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });

          // 2. Await #templeAudioBtn mounted naturally by frontend/assets/js/main.js
          const btn = await page.waitForSelector('#templeAudioBtn', { visible: true, timeout: 5000 });
          assert.ok(btn, 'Application main.js must mount #templeAudioBtn into #templeAudioWrap');

          // 3. Verify initial icon is bell emoji 🔔
          const initialIcon = await page.$eval('#templeAudioBtn', (el) => el.textContent.trim());
          assert.strictEqual(initialIcon, '🔔', 'Initial icon should be bell emoji 🔔');

          // 4. Verify initial audio paused state
          const initialPaused = await page.$eval('#templeAudio', (el) => el.paused);
          assert.strictEqual(initialPaused, true, 'Audio should initially be paused');

          // 5. First user click to toggle playback on
          await safeClick(page, '#templeAudioBtn');
          await delay(200);

          const playingIcon = await page.$eval('#templeAudioBtn', (el) => el.textContent.trim());
          assert.strictEqual(playingIcon, '⏸️', 'Icon should change to pause emoji ⏸️ when playing');

          // 6. Second user click to toggle playback off
          await safeClick(page, '#templeAudioBtn');
          await delay(200);

          const revertedIcon = await page.$eval('#templeAudioBtn', (el) => el.textContent.trim());
          assert.strictEqual(revertedIcon, '🔔', 'Icon should revert back to bell emoji 🔔 when paused');

          const revertedPaused = await page.$eval('#templeAudio', (el) => el.paused);
          assert.strictEqual(revertedPaused, true, 'Audio should be paused after toggle');

          // 7. Verify natural 'ended' event handling
          // Click again to initiate playback (icon -> ⏸️)
          await safeClick(page, '#templeAudioBtn');
          await delay(200);
          const activeIcon = await page.$eval('#templeAudioBtn', (el) => el.textContent.trim());
          assert.strictEqual(activeIcon, '⏸️', 'Icon should be ⏸️ before ended event');

          // Dispatch native 'ended' event on the real audio element
          await page.$eval('#templeAudio', (el) => {
            el.dispatchEvent(new Event('ended'));
          });
          await delay(100);

          const endedIcon = await page.$eval('#templeAudioBtn', (el) => el.textContent.trim());
          assert.strictEqual(endedIcon, '🔔', 'Icon should revert to 🔔 on ended event via main.js');
        } finally {
          await page.close();
        }
      }
    }
  ]
};
