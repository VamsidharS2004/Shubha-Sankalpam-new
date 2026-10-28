const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('booking pages have short addresses: /booking/290416 (details) and /pay/290416 (payment)', () => {
  const js = read('frontend/assets/js/pages/payment.js');
  assert.match(js, /\(booking\|pay\)/);                         // the page understands the short links
  assert.match(js, /history\.replaceState\(null, "", "\/" \+/); // and rewrites a long link to a short one
  assert.ok(!/replaceState\(null, "", "payment\.html\?bookingId/.test(js)); // no long address is written back
  assert.match(read('backend/server.js'), /\(booking\|pay\)/);  // the server opens payment.html for them
  const v = JSON.parse(read('vercel.json'));
  const src = v.rewrites.map(r => r.source);
  assert.ok(src.some(s => s.startsWith('/booking/')) && src.some(s => s.startsWith('/pay/')));
  assert.ok(read('frontend/payment.html').includes('<base href="/">'), 'relative links must work under /booking/...');
});

test('bell / Continue payment (start=1) goes straight to the payment window without flashing the Scan & Pay page', () => {
  assert.match(read('frontend/payment.html'), /ss-pay-direct/);
  const js = read('frontend/assets/js/pages/payment.js');
  assert.match(js, /function showPayPage/);
  assert.match(js, /ondismiss: function \(\) \{[\s\S]*?showPayPage\(\);/);
  assert.match(read('frontend/assets/js/navbar.js'), /payment\.html\?bookingId=.*&start=1/);
});

test('direct payment is fast and cancelling shows Continue Payment at once (no second "Opening secure payment" screen)', () => {
  const js = read('frontend/assets/js/pages/payment.js');
  assert.match(js, /const cfgPromise = api\("\/api\/payments\/config"\)/);   // settings request starts immediately
  assert.match(read('frontend/payment.html'), /rzpEarly/);                    // Razorpay script starts downloading immediately
  assert.match(js, /rzp\.open\(\); showPayPage\(\)/);   // page behind the payment window is ready, so cancel shows Continue Payment at once
});
