/**
 * Suite 04: Localization (Telugu, Hindi, and English Language Switching & UI Translations)
 */
const { createPage, safeClick, delay } = require('../helpers/browser');

module.exports = {
  name: '04_localization.test.js',
  tests: [
    {
      name: 'Switching language to Telugu (te) translates UI elements across homepage',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => {
            localStorage.setItem('ss_lang', 'en');
          });
          await page.reload({ waitUntil: 'networkidle0' });

          // Verify initial English string
          const initialTitle = await page.$eval('h2[data-i18n-list="our_pujas"]', (el) =>
            el.textContent.trim()
          );
          assert.strictEqual(initialTitle, 'Our Pujas', 'Initial title should be English "Our Pujas"');

          // Open language dropdown
          await safeClick(page, '#langBtn');
          await page.waitForSelector('.lang-item[data-lang="te"]', { visible: true });

          // Click Telugu
          await safeClick(page, '.lang-item[data-lang="te"]');
          await delay(500);

          // Assert Telugu label in navbar
          const langLabel = await page.$eval('#langLabel', (el) => el.textContent.trim());
          assert.strictEqual(langLabel, 'తెలుగు', 'Navbar label should display "తెలుగు"');

          // Assert translated elements
          const teTitle = await page.$eval('h2[data-i18n-list="our_pujas"]', (el) =>
            el.textContent.trim()
          );
          assert.strictEqual(teTitle, 'మా పూజలు', 'Our Pujas should be translated to Telugu "మా పూజలు"');

          const teTab = await page.$eval('button.tab[data-cat="All"]', (el) => el.textContent.trim());
          assert.strictEqual(teTab, 'అన్నీ', 'All tab should be translated to Telugu "అన్నీ"');

          const teHeroBtn = await page.$eval('a.hero-btn-secondary', (el) => el.textContent.trim());
          assert.strictEqual(
            teHeroBtn,
            'అన్ని ప్రత్యేకాలను చూడండి',
            'Hero button should translate to Telugu'
          );

          const teSwipe = await page.$eval('.hero-swipe', (el) => el.textContent.trim());
          assert.strictEqual(teSwipe, 'స్వైప్ చేయండి »', 'Hero swipe should translate to Telugu');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Switching language to Hindi (hi) translates UI elements across homepage',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });

          // Open language dropdown
          await safeClick(page, '#langBtn');
          await page.waitForSelector('.lang-item[data-lang="hi"]', { visible: true });

          // Click Hindi
          await safeClick(page, '.lang-item[data-lang="hi"]');
          await delay(500);

          // Assert Hindi label in navbar
          const langLabel = await page.$eval('#langLabel', (el) => el.textContent.trim());
          assert.strictEqual(langLabel, 'हिन्दी', 'Navbar label should display "हिन्दी"');

          // Assert translated elements
          const hiTitle = await page.$eval('h2[data-i18n-list="our_pujas"]', (el) =>
            el.textContent.trim()
          );
          assert.strictEqual(
            hiTitle,
            'हमारी पूजाएँ',
            'Our Pujas should be translated to Hindi "हमारी पूजाएँ"'
          );

          const hiTab = await page.$eval('button.tab[data-cat="All"]', (el) => el.textContent.trim());
          assert.strictEqual(hiTab, 'सभी', 'All tab should be translated to Hindi "सभी"');

          const hiHeroBtn = await page.$eval('a.hero-btn-secondary', (el) => el.textContent.trim());
          assert.strictEqual(
            hiHeroBtn,
            'सभी विशेष देखें',
            'Hero button should translate to Hindi'
          );

          const hiSwipe = await page.$eval('.hero-swipe', (el) => el.textContent.trim());
          assert.strictEqual(hiSwipe, 'स्वाइप करें »', 'Hero swipe should translate to Hindi');
        } finally {
          await page.close();
        }
      }
    },
    {
      name: 'Switching back to English (en) restores original UI text',
      fn: async ({ browser, baseUrl, assert }) => {
        const page = await createPage(browser);
        try {
          await page.goto(`${baseUrl}/home.html`, { waitUntil: 'networkidle0' });

          // Open language dropdown
          await safeClick(page, '#langBtn');
          await page.waitForSelector('.lang-item[data-lang="en"]', { visible: true });

          // Click English
          await safeClick(page, '.lang-item[data-lang="en"]');
          await delay(500);

          const enTitle = await page.$eval('h2[data-i18n-list="our_pujas"]', (el) =>
            el.textContent.trim()
          );
          assert.strictEqual(enTitle, 'Our Pujas', 'Should restore English title "Our Pujas"');

          const enTab = await page.$eval('button.tab[data-cat="All"]', (el) => el.textContent.trim());
          assert.strictEqual(enTab, 'All', 'Should restore English tab "All"');

          const enSwipe = await page.$eval('.hero-swipe', (el) => el.textContent.trim());
          assert.strictEqual(enSwipe, 'Swipe »', 'Should restore English "Swipe »"');
        } finally {
          await page.close();
        }
      }
    }
  ]
};
