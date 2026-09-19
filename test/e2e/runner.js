/**
 * Shubha Sankalpam E2E Automated Test Runner
 * Orchestrates server verification, browser launch, suite execution, and formatted reporting.
 */
const path = require('path');
const config = require('./config');
const { launchBrowser } = require('./helpers/browser');
const { ensureServerRunning, stopServer } = require('./helpers/server');

// Built-in lightweight assertion library
const assert = {
  ok(val, msg) {
    if (!val) throw new Error(msg || `Assertion failed: expected truthy value, got ${val}`);
  },
  strictEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(
        msg || `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  },
  includes(str, substr, msg) {
    if (typeof str !== 'string' || !str.includes(substr)) {
      throw new Error(
        msg || `Assertion failed: expected "${str}" to contain substring "${substr}"`
      );
    }
  },
  match(str, regex, msg) {
    if (!regex.test(str)) {
      throw new Error(msg || `Assertion failed: expected "${str}" to match ${regex}`);
    }
  }
};

const suiteFiles = [
  './suites/01_auth.test.js',
  './suites/02_booking.test.js',
  './suites/03_payment.test.js',
  './suites/04_localization.test.js',
  './suites/05_audio.test.js',
  './suites/06_admin.test.js'
];

async function runAll() {
  console.log('============================================================');
  console.log('       SHUBHA SANKALPAM E2E AUTOMATED TEST SUITE            ');
  console.log('============================================================');
  console.log(` Target: ${config.BASE_URL}`);

  let serverInfo = null;
  let browser = null;
  let isShuttingDown = false;
  const startTime = Date.now();

  const cleanupAndExit = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n\n[PROCESS] Received ${signal}. Terminating browser and child processes...`);

    if (browser) {
      try {
        await Promise.race([
          browser.close(),
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
        console.log('[PROCESS] Headless browser closed cleanly.');
      } catch (err) {
        console.error('[PROCESS] Error closing browser:', err.message);
      }
    }

    if (serverInfo) {
      try {
        await stopServer(serverInfo);
        console.log('[PROCESS] Test server stopped.');
      } catch (err) {}
    }

    const exitCode = signal === 'SIGINT' ? 130 : 143;
    process.exit(exitCode);
  };

  const sigintHandler = () => cleanupAndExit('SIGINT');
  const sigtermHandler = () => cleanupAndExit('SIGTERM');

  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigtermHandler);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: []
  };

  try {
    // 1. Ensure server is running
    console.log('\n[1/3] Probing server status...');
    serverInfo = await ensureServerRunning();
    console.log(`✓ Server ready (${serverInfo.status}) at ${serverInfo.baseUrl}`);

    // 2. Launch headless Chromium
    console.log('\n[2/3] Launching Puppeteer browser...');
    browser = await launchBrowser();
    const version = await browser.version();
    console.log(`✓ Browser initialized: ${version}`);

    // 3. Execute test suites
    console.log('\n[3/3] Executing test suites:');
    console.log('------------------------------------------------------------');

    for (const file of suiteFiles) {
      const suitePath = path.resolve(__dirname, file);
      const suite = require(suitePath);

      for (const testItem of suite.tests) {
        results.total++;
        const testStart = Date.now();

        try {
          await testItem.fn({
            browser,
            baseUrl: serverInfo.baseUrl,
            assert,
            config
          });

          results.passed++;
          const duration = ((Date.now() - testStart) / 1000).toFixed(2);
          console.log(` [PASS] ${suite.name} > ${testItem.name} (${duration}s)`);
        } catch (err) {
          results.failed++;
          const duration = ((Date.now() - testStart) / 1000).toFixed(2);
          console.log(` [FAIL] ${suite.name} > ${testItem.name} (${duration}s)`);
          console.log(`        Error: ${err.message}`);

          results.failures.push({
            suite: suite.name,
            test: testItem.name,
            error: err
          });
        }
      }
    }
  } catch (fatalErr) {
    console.error('\n[FATAL ERROR during test execution]:', fatalErr.message);
    if (fatalErr.stack) console.error(fatalErr.stack);
    results.failed++;
  } finally {
    process.removeListener('SIGINT', sigintHandler);
    process.removeListener('SIGTERM', sigtermHandler);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    if (serverInfo) {
      try {
        await stopServer(serverInfo);
      } catch (e) {}
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('------------------------------------------------------------');
    console.log(
      ` RESULTS: ${results.passed} Passed, ${results.failed} Failed, ${results.skipped} Skipped (Total: ${results.total})`
    );
    console.log(` DURATION: ${totalDuration}s`);

    if (results.failures.length > 0) {
      console.log('\n FAILURES SUMMARY:');
      results.failures.forEach((f, idx) => {
        console.log(` ${idx + 1}. [${f.suite}] ${f.test}`);
        console.log(`    ${f.error.stack || f.error.message}`);
      });
      console.log('\n STATUS: TESTS FAILED');
      console.log('============================================================\n');
      process.exit(1);
    } else {
      console.log(' STATUS: ALL TESTS PASSED');
      console.log('============================================================\n');
      process.exit(0);
    }
  }
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
