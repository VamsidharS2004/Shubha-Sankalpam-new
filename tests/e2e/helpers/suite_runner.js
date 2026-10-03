/**
 * Single-suite execution runner for standalone execution
 */
const config = require('../config');
const { HttpClient } = require('./http_client');
const { ensureServerRunning, stopServer } = require('./server');

async function runSuite(suite) {
  console.log('================================================================');
  console.log(` STANDALONE SUITE: ${suite.name}`);
  console.log('================================================================');

  let serverInfo = null;
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const failures = [];

  try {
    serverInfo = await ensureServerRunning();
    const client = new HttpClient(serverInfo.baseUrl);

    for (const testItem of suite.tests) {
      const testStart = Date.now();
      try {
        await testItem.fn({
          client,
          baseUrl: serverInfo.baseUrl,
          config
        });
        passed++;
        const duration = ((Date.now() - testStart) / 1000).toFixed(2);
        console.log(`  [PASS] ${testItem.name} (${duration}s)`);
      } catch (err) {
        failed++;
        const duration = ((Date.now() - testStart) / 1000).toFixed(2);
        console.log(`  [FAIL] ${testItem.name} (${duration}s)`);
        console.log(`         Error: ${err.message}`);
        failures.push({ test: testItem.name, error: err });
      }
    }
  } catch (fatal) {
    console.error('Fatal error running suite:', fatal);
    failed++;
  } finally {
    if (serverInfo) {
      try {
        await stopServer(serverInfo);
      } catch (e) {}
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('----------------------------------------------------------------');
    console.log(` Results: ${passed} Passed, ${failed} Failed (${duration}s)`);
    console.log('================================================================');

    if (failures.length > 0) {
      failures.forEach((f, i) => {
        console.log(`\n${i + 1}. ${f.test}`);
        console.log(`   ${f.error.stack || f.error.message}`);
      });
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

module.exports = { runSuite };
