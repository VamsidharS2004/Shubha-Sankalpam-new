/**
 * Puppeteer Browser Launcher and Automation Helpers
 */
const config = require('../config');

let puppeteer = null;
for (const candidate of config.PUPPETEER_CANDIDATE_PATHS) {
  try {
    puppeteer = require(candidate);
    if (puppeteer) break;
  } catch (e) {}
}

if (!puppeteer) {
  throw new Error('Could not resolve Puppeteer from candidate paths. Please ensure Puppeteer is installed.');
}

async function launchBrowser(customOptions = {}) {
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,800'
  ];

  const defaultOptions = {
    headless: 'new',
    args: launchArgs,
    defaultViewport: { width: 1280, height: 800 }
  };

  const options = Object.assign({}, defaultOptions, customOptions);
  return await puppeteer.launch(options);
}

async function createPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page._dialogs = [];
  page._consoleLogs = [];

  page.on('dialog', async (dialog) => {
    const info = {
      message: dialog.message(),
      type: dialog.type(),
      timestamp: Date.now()
    };
    page._dialogs.push(info);
    try {
      await dialog.accept();
    } catch (err) {}
  });

  page.on('console', (msg) => {
    page._consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  page.getLastDialog = () => {
    if (page._dialogs.length === 0) return null;
    return page._dialogs[page._dialogs.length - 1];
  };

  page.clearDialogs = () => {
    page._dialogs = [];
  };

  page.waitForDialog = (timeout = 5000) => {
    const initialCount = page._dialogs.length;
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (page._dialogs.length > initialCount) {
          clearInterval(interval);
          resolve(page._dialogs[page._dialogs.length - 1]);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          resolve(null);
        }
      }, 50);
    });
  };

  return page;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeClick(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await delay(100);
  await page.click(selector);
}

async function safeType(page, selector, text, clear = true, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  if (clear) {
    await page.$eval(selector, (el) => {
      el.value = '';
    });
  }
  await page.type(selector, String(text), { delay: 20 });
}

async function getText(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { timeout });
  return await page.$eval(selector, (el) => (el.textContent || '').trim());
}

module.exports = {
  puppeteer,
  launchBrowser,
  createPage,
  delay,
  safeClick,
  safeType,
  getText
};
