/**
 * Shubha Sankalpam Opaque-Box E2E Master Test Runner
 * Orchestrates server verification, multi-tier test execution, and comprehensive reporting.
 *
 * Usage:
 *   node tests/e2e/runner.js             # Runs all tiers (Tier 1 to 4)
 *   node tests/e2e/runner.js --tier=1    # Runs Tier 1 Feature Coverage
 *   node tests/e2e/runner.js --tier=2    # Runs Tier 2 Boundary & Corner Cases
 *   node tests/e2e/runner.js --tier=3    # Runs Tier 3 Cross-Feature Interactions
 *   node tests/e2e/runner.js --tier=4    # Runs Tier 4 Real-World Scenarios
 */
const path = require('path');
const config = require('./config');
const { HttpClient } = require('./helpers/http_client');
const { ensureServerRunning, stopServer } = require('./helpers/server');

const allSuites = [
  { tier: 1, file: './tier1_features.test.js' },
  { tier: 2, file: './tier2_boundaries.test.js' },
  { tier: 3, file: './tier3_interactions.test.js' },
  { tier: 4, file: './tier4_realworld.test.js' }
];

async function run() {
  const args = process.argv.slice(2);
  let selectedTier = null;
  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      const val = arg.split('=')[1].trim().toLowerCase();
      if (val !== 'all') {
        selectedTier = parseInt(val, 10);
      }
    }
  }

  const suitesToRun = selectedTier
    ? allSuites.filter((s) => s.tier === selectedTier)
    : allSuites;

  console.log('================================================================');
  console.log('       SHUBHA SANKALPAM OPAQUE-BOX E2E TEST RUNNER             ');
  console.log('================================================================');
  console.log(` Target Server : ${config.BASE_URL}`);
  console.log(` Selected Tiers: ${selectedTier ? `Tier ${selectedTier}` : 'All Tiers (1 - 4)'}`);
  console.log('----------------------------------------------------------------');

  let serverInfo = null;
  let isShuttingDown = false;
  const startTime = Date.now();

  const cleanup = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[CLEANUP] Stopping test server and background workers (${signal})...`);
    if (serverInfo) {
      try {
        await stopServer(serverInfo);
      } catch (e) {}
    }
    const exitCode = signal === 'SIGINT' ? 130 : 143;
    process.exit(exitCode);
  };

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: []
  };

  try {
    // 1. Ensure server is online
    console.log('\n[1/2] Probing server availability and DEMO_MODE...');
    serverInfo = await ensureServerRunning();
    console.log(`✓ Test server ready (${serverInfo.status}) at ${serverInfo.baseUrl}`);

    const client = new HttpClient(serverInfo.baseUrl);

    // 2. Execute suites
    console.log('\n[2/2] Executing E2E test suites:\n');

    for (const suiteDef of suitesToRun) {
      const suitePath = path.resolve(__dirname, suiteDef.file);
      const suite = require(suitePath);

      console.log(`>>> ${suite.name}`);

      for (const testItem of suite.tests) {
        results.total++;
        const testStart = Date.now();

        try {
          await testItem.fn({
            client,
            baseUrl: serverInfo.baseUrl,
            config
          });

          results.passed++;
          const duration = ((Date.now() - testStart) / 1000).toFixed(2);
          console.log(`  [PASS] ${testItem.name} (${duration}s)`);
        } catch (err) {
          results.failed++;
          const duration = ((Date.now() - testStart) / 1000).toFixed(2);
          console.log(`  [FAIL] ${testItem.name} (${duration}s)`);
          console.log(`         Error: ${err.message}`);

          results.failures.push({
            suite: suite.name,
            test: testItem.name,
            id: testItem.id || null,
            error: err
          });
        }
      }
      console.log('');
    }
  } catch (fatalErr) {
    console.error('\n[FATAL ERROR during test execution]:', fatalErr.message);
    if (fatalErr.stack) console.error(fatalErr.stack);
    results.failed++;
  } finally {
    if (serverInfo) {
      try {
        await stopServer(serverInfo);
      } catch (e) {}
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('================================================================');
    console.log('                        TEST RUN SUMMARY                        ');
    console.log('================================================================');
    console.log(` Total Tests : ${results.total}`);
    console.log(` Passed      : ${results.passed}`);
    console.log(` Failed      : ${results.failed}`);
    console.log(` Skipped     : ${results.skipped}`);
    console.log(` Duration    : ${totalDuration}s`);
    console.log('================================================================');

    if (results.failures.length > 0) {
      console.log('\nFAILURES DETAIL:');
      results.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}. [${f.suite}] ${f.test}`);
        console.log(`   ${f.error.stack || f.error.message}`);
      });
      console.log('\nOVERALL STATUS: TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\nOVERALL STATUS: ALL TESTS PASSED ✓');
      process.exit(0);
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
