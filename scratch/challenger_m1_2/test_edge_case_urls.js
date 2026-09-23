/**
 * Master Edge-Case & Error Handling Test Runner (Milestone 1, Challenger M1-2)
 * Executes test_booking_redirects.js, test_payment_redirects.js,
 * test_details_fallback.js, and test_cards_empty_state.js.
 */
const path = require('path');

console.log('================================================================');
console.log('   CHALLENGER M1-2: EDGE-CASE & ERROR HANDLING EMPIRICAL SUITE  ');
console.log('================================================================\n');

try {
  require('./test_booking_redirects');
  require('./test_payment_redirects');
  require('./test_details_fallback');
  require('./test_cards_empty_state');

  console.log('================================================================');
  console.log('   ALL 4 EDGE-CASE SUITES PASSED EMPIRICALLY (VERDICT: APPROVE) ');
  console.log('================================================================\n');
} catch (err) {
  console.error('\n[SUITE FAILURE]:', err.message);
  console.error(err.stack);
  process.exit(1);
}
