const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const { summarize, rangeFor } = require('../backend/utils/analyticsSummary');

test('analytics counts cancelled bookings so the Bookings link shows the same number', () => {
  const now = new Date('2026-10-26T10:00:00Z'), range = rangeFor(30, now);
  const mk = (id, status, payment_status) => ({ id, created_at: '2026-10-25T05:00:00Z', price: 100, status, payment_status });
  const r = summarize([], [mk(1, 'Confirmed', 'Paid'), mk(2, 'Cancelled by user', 'Pending'), mk(3, 'Failed', 'Failed'), mk(4, 'video-sent', 'Paid')], [], range, now);
  assert.equal(r.metrics.cancelledBookings, 2);
  assert.equal(r.metrics.paidBookings, 2);
  assert.equal(r.metrics.completedBookings, 1);
});

test('admin page: booking status dropdown replaces the tabs, devotee filters and editor guide are wired', () => {
  const html = read('backend/admin.html');
  assert.ok(html.includes('id="bookingStatusFilter"'));
  assert.ok(!html.includes('<button class="filter-btn">Scheduled</button>') && !html.includes('<button class="filter-btn active">All</button>'));
  for (const v of ['all', 'confirmed', 'video', 'pending', 'cancelled']) assert.ok(html.includes('<option value="' + v + '">'), v);
  for (const id of ['devoteeGroupBy', 'devoteeFrom', 'devoteeTo', 'devoteePujaFilter', 'reportBookingMetrics']) assert.ok(html.includes('id="' + id + '"'), id);
  assert.ok(html.includes('/assets/js/admin-editor-guide.js'));
  const js = read('frontend/assets/js/admin.js');
  assert.ok(js.includes('window.openBookingsFiltered') && js.includes('function bookingMatchesStatus'));
  assert.ok(read('frontend/assets/js/admin-analytics.js').includes('openBookingsFiltered'));
});

test('puja editor guide: every Telugu field name has a "where it shows" line and the ids exist in the editor', () => {
  const guide = read('frontend/assets/js/admin-editor-guide.js'), html = read('backend/admin.html');
  const ids = [...guide.matchAll(/\["#(edit[A-Za-z]+)", "/g)];
  assert.ok(ids.length >= 15, 'too few fields in the guide');
  for (const m of ids) assert.ok(html.includes('id="' + m[1] + '"'), m[1]);
});
