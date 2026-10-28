const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const UUID = '11111111-1111-4111-8111-111111111111';

/* run the real tracker file in a fake browser */
function runTracker({ url = 'https://www.shubhasankalpam.com/home.html', ua = 'Mozilla/5.0 Chrome', referrer = '', site, store = {}, session = {}, currentPuja, dnt = null } = {}) {
  const u = new URL(url), sent = [], fbqCalls = [], scripts = [];
  const mkStore = o => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } });
  const ls = mkStore(store), ss = mkStore(session);
  let n = 0;
  const ctx = {
    navigator: { userAgent: ua, doNotTrack: dnt }, location: { pathname: u.pathname, search: u.search, hostname: u.hostname },
    document: { referrer, readyState: 'complete', prerendering: false, documentElement: { lang: 'te' }, addEventListener() {},
      createElement: () => { const s = {}; scripts.push(s); return s; }, getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }] },
    localStorage: ls, sessionStorage: ss, crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` },
    fetch: (u2, o) => { sent.push(JSON.parse(o.body)); return Promise.resolve(); },
    innerWidth: 390, URL, URLSearchParams, JSON, Date, setTimeout: fn => fn(), requestIdleCallback: fn => fn(), addEventListener() {}, console
  };
  ctx.window = ctx; if (site !== undefined) ctx.SITE = site; if (currentPuja) ctx.currentPuja = currentPuja;
  vm.createContext(ctx); vm.runInContext(read('frontend/assets/js/analytics-tracker.js'), ctx);
  /* fbq is created by the pixel snippet; record its calls */
  return { ctx, sent, scripts, store, session };
}
const first = r => r.sent.find(e => e.type === 'page_view');

test('Instagram ad (fbclid + utm from Meta) is recorded as an Instagram ad click with campaign and ad name', () => {
  const r = runTracker({ url: 'https://www.shubhasankalpam.com/puja-details/002?utm_source=ig&utm_medium=paid&utm_campaign=Diwali%20Homam&utm_content=Reel%201&fbclid=AbC', referrer: 'https://l.instagram.com/' });
  const e = first(r);
  assert.equal(e.channel, 'instagram'); assert.equal(e.ad, true); assert.equal(e.landing, true);
  assert.equal(e.campaign, 'Diwali Homam'); assert.equal(e.content, 'Reel 1'); assert.equal(e.medium, 'paid');
  assert.equal(e.page, 'puja-details.html');
});
test('Facebook: utm fb, in-app browser, or fbclid alone are all recognised; unresolved {{macros}} are ignored', () => {
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?utm_source=fb&utm_medium=paid' })).channel, 'facebook');
  const app = first(runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=x', ua: 'Mozilla/5.0 [FBAN/FBIOS;FBAV/400]' }));
  assert.equal(app.channel, 'facebook'); assert.equal(app.ad, true);
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=x', ua: 'Mozilla/5.0 Instagram 300' })).channel, 'instagram');
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=x' })).channel, 'meta');
  const raw = first(runTracker({ url: 'https://www.shubhasankalpam.com/?utm_source={{site_source_name}}&utm_campaign={{campaign.name}}&fbclid=x', ua: 'Instagram' }));
  assert.equal(raw.channel, 'instagram'); assert.ok(!raw.campaign);
});
test('Google / YouTube, X, TikTok and Bing ad clicks are counted too', () => {
  const g = first(runTracker({ url: 'https://www.shubhasankalpam.com/?gclid=abc' })); assert.equal(g.channel, 'google'); assert.equal(g.ad, true);
  const yt = first(runTracker({ url: 'https://www.shubhasankalpam.com/?utm_source=youtube&utm_medium=paid&utm_campaign=Diwali' })); assert.equal(yt.channel, 'youtube'); assert.equal(yt.ad, true); assert.equal(yt.campaign, 'Diwali');
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?twclid=1' })).channel, 'x');
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?ttclid=1' })).channel, 'tiktok');
  assert.equal(first(runTracker({ url: 'https://www.shubhasankalpam.com/?msclkid=1' })).channel, 'bing');
  assert.equal(first(runTracker({ referrer: 'https://www.youtube.com/watch?v=1' })).channel, 'youtube');
  assert.ok(!first(runTracker({ referrer: 'https://www.youtube.com/watch?v=1' })).ad, 'an ordinary YouTube link is not an ad click');
});
test('organic visits are not counted as ad clicks', () => {
  const direct = first(runTracker()); assert.equal(direct.channel, 'direct'); assert.ok(!direct.ad);
  const g = first(runTracker({ referrer: 'https://www.google.com/' })); assert.equal(g.channel, 'google'); assert.ok(!g.ad);
  const wa = first(runTracker({ referrer: 'https://wa.me/' })); assert.equal(wa.channel, 'whatsapp');
  const bio = first(runTracker({ url: 'https://www.shubhasankalpam.com/?igsh=abc' })); assert.equal(bio.channel, 'instagram'); assert.ok(!bio.ad);
});
test('a returning visitor who clicks a NEW ad is counted again; a reload of the same click is not', () => {
  const store = {}, session = {};
  const a = runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=one', ua: 'Instagram', store, session });
  const reload = runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=one', ua: 'Instagram', store, session });
  assert.equal(first(a).landing, true); assert.ok(!first(reload).landing);
  assert.equal(first(a).sessionId, first(reload).sessionId);
  const second = runTracker({ url: 'https://www.shubhasankalpam.com/?fbclid=two', ua: 'Instagram', store, session });
  assert.equal(first(second).landing, true); assert.notEqual(first(second).sessionId, first(a).sessionId);
  const inner = runTracker({ url: 'https://www.shubhasankalpam.com/puja.html', store, session });
  assert.equal(first(inner).channel, 'instagram'); assert.equal(first(inner).ad, true); assert.ok(!first(inner).landing, 'later pages of the same visit keep the ad source');
});
test('Meta Pixel stays off without an ID, and loads with the right privacy settings when an ID is saved', () => {
  const off = runTracker({ site: { META_PIXEL_ID: '' } });
  assert.equal(off.ctx.fbq, undefined);
  const bad = runTracker({ site: { META_PIXEL_ID: 'abc' } }); assert.equal(bad.ctx.fbq, undefined);
  const on = runTracker({ site: { META_PIXEL_ID: '123456789012345' } });
  assert.equal(typeof on.ctx.fbq, 'function'); assert.ok(on.scripts.some(s => s.src === 'https://connect.facebook.net/en_US/fbevents.js'));
  const q = [...on.ctx.fbq.queue].map(a => [...a]);
  assert.deepEqual(q[0], ['set', 'autoConfig', false, '123456789012345']);
  assert.deepEqual(q[1], ['init', '123456789012345']);
  assert.deepEqual(q[2], ['track', 'PageView']);
});
test('booking steps become Meta events once per booking (InitiateCheckout, Lead, Purchase) and ViewContent on a puja', () => {
  const item = { id: '002', name: 'Chandi Homam', price: '₹ 816' };
  const r = runTracker({ site: { META_PIXEL_ID: '123456789012345' }, currentPuja: item, url: 'https://www.shubhasankalpam.com/puja-details/002' });
  r.ctx.ssTrack('checkout_start', item, 'bk002');
  r.ctx.ssTrack('booking_created', item, 'B-1'); r.ctx.ssTrack('booking_created', item, 'B-1');
  r.ctx.ssTrack('payment_done', item, 'B-1');
  const calls = [...r.ctx.fbq.queue].map(a => [...a]).filter(a => a[0] === 'track' && a[1] !== 'PageView');
  const names = calls.map(c => c[1]);
  assert.deepEqual(names, ['ViewContent', 'InitiateCheckout', 'Lead', 'Purchase'], 'the repeated Lead is dropped');
  const purchase = calls.find(c => c[1] === 'Purchase');
  assert.deepEqual(purchase[2], { content_type: 'product', currency: 'INR', content_ids: ['002'], content_name: 'Chandi Homam', value: 816 });
  assert.deepEqual(purchase[3], { eventID: 'Purchase_B-1' });
  assert.ok(r.sent.some(e => e.type === 'booking_created' && e.pujaId === '002'), 'also recorded in our own analytics');
});
test('no tracking at all, and no Meta Pixel, when the browser says Do Not Track', () => {
  const r = runTracker({ site: { META_PIXEL_ID: '123456789012345' }, dnt: '1' });
  assert.equal(r.sent.length, 0); assert.equal(r.ctx.fbq, undefined); assert.equal(r.ctx.ssTrack, undefined);
});

const { validateEvent } = require('../backend/controllers/analyticsReportController');
test('server accepts the new event types and fields, and cleans free text', () => {
  const base = { id: UUID, visitorId: UUID, sessionId: UUID, page: 'home.html', language: 'te', device: 'mobile', referrer: 'l.instagram.com' };
  const row = validateEvent({ ...base, type: 'page_view', channel: 'instagram', campaign: 'Diwali <b>x</b>', medium: 'paid', content: 'reel', ad: true, landing: true });
  assert.equal(row.channel, 'instagram'); assert.equal(row.is_ad, true); assert.equal(row.is_landing, true);  assert.equal(row.campaign, 'Diwali bx/b');
  assert.ok(!/[<>]/.test(row.campaign));
  for (const type of ['checkout_start', 'booking_created', 'payment_done']) assert.equal(validateEvent({ ...base, page: 'booking.html', type }).event_type, type);
  assert.throws(() => validateEvent({ ...base, type: 'hack' }));
  assert.equal(validateEvent({ ...base, type: 'page_view', channel: 'bad;chan' }).channel, null);
  assert.equal(validateEvent({ ...base, type: 'page_view', landing: 'yes', ad: 1 }).is_landing, false);
  assert.equal(validateEvent({ ...base, page: 'booking.html', type: 'booking_created', landing: true }).is_landing, false, 'only a page view can be a landing');
});

const { buildAdReport } = require('../backend/utils/adTraffic');
test('ad report counts visits, ad clicks, funnel steps per source and campaign', () => {
  const range = { start: '2026-10-01T00:00:00Z', end: '2026-10-31T00:00:00Z' };
  let n = 0; const ev = (s, type, o = {}) => ({ id: 'e' + (++n), session_id: s, visitor_id: 'v' + s, event_type: type, page: 'home.html', device: 'mobile', language: 'te', referrer: 'Direct', created_at: `2026-10-10T10:${String(n % 60).padStart(2, '0')}:00Z`, ...o });
  const ig = { channel: 'instagram', campaign: 'diwali', content: 'reel 1', medium: 'paid', is_ad: true };
  const events = [
    ev('s1', 'page_view', { ...ig, is_landing: true, page: 'puja-details.html' }), ev('s1', 'puja_view', { ...ig, puja_id: '002', puja_name: 'Chandi Homam' }), ev('s1', 'checkout_start', ig), ev('s1', 'booking_created', ig),
    ev('s2', 'page_view', { ...ig, is_landing: true }),
    ev('s3', 'page_view', { channel: 'facebook', is_ad: true, is_landing: true, campaign: 'diwali', medium: 'paid' }),
    ev('s4', 'page_view', { channel: 'direct', is_landing: true }),
    ev('s5', 'page_view', { channel: 'google', is_landing: true }),
    ev('old', 'page_view', { referrer: 'l.instagram.com', source: 'instagram' }) // an old row from before ad tracking
  ];
  const r = buildAdReport(events, range);
  assert.equal(r.totals.adClicks, 3); assert.equal(r.totals.instagramVisits, 3); assert.equal(r.totals.facebookVisits, 1);
  assert.equal(r.totals.adViewedPuja, 1); assert.equal(r.totals.adStartedBooking, 1); assert.equal(r.totals.adBooked, 1); assert.equal(r.totals.adPaid, 0);
  const igRow = r.channels.find(c => c.name === 'instagram'); assert.equal(igRow.visits, 3); assert.equal(igRow.adClicks, 2); assert.equal(igRow.booked, 1);
  const camp = r.campaigns.find(c => c.channel === 'instagram'); assert.equal(camp.campaign, 'diwali'); assert.equal(camp.ad, 'reel 1'); assert.equal(camp.visits, 2);
  assert.equal(r.campaigns.length, 2);
  assert.equal(r.pujas[0].name, 'Chandi Homam');
  assert.equal(r.recentClicks.length, 3); assert.ok(r.recentClicks.some(c => c.stage === 'Booking created' && c.puja === 'Chandi Homam' && c.landingPage === 'puja-details.html'));
  assert.equal(r.daily.find(d => d.date === '2026-10-10').instagram, 2);
  assert.equal(r.hasColumns, true);
  assert.equal(buildAdReport([{ id: 'x', session_id: 's', visitor_id: 'v', event_type: 'page_view', created_at: '2026-10-10T10:00:00Z', page: 'home.html' }], range).hasColumns, false);
});

const { validateSettings } = require('../backend/controllers/siteSettingsController');
test('Meta Pixel ID is saved from Site Settings and must be digits', () => {
  /* the real site-settings.js may already hold the owner's saved Pixel ID, so start this test from a blank one */
  const base = { ...require('../frontend/content/site-settings.js').SITE, DEFAULT_LANGUAGE: 'te', META_PIXEL_ID: '' };
  assert.equal(validateSettings({ ...base, META_PIXEL_ID: ' 1234567890123456 ' }).META_PIXEL_ID, '1234567890123456');
  assert.equal(validateSettings({ ...base }).META_PIXEL_ID, '');
  assert.throws(() => validateSettings({ ...base, META_PIXEL_ID: '12ab' }), /Pixel ID/);
  assert.match(read('frontend/assets/js/admin.js'), /\['META_PIXEL_ID'/);
});
test('wiring: booking and payment pages call the tracker, admin shows the ads panel, migration exists', () => {
  assert.match(read('frontend/assets/js/booking.js'), /ssTrack\('checkout_start'/);
  assert.match(read('frontend/assets/js/booking.js'), /ssTrack\('booking_created', item, out\.id\)/);
  assert.equal((read('frontend/assets/js/pages/payment.js').match(/ssTrack\("payment_done"/g) || []).length, 2);
  const admin = read('backend/admin.html');
  for (const idn of ['adsPanel', 'adsMetrics', 'adsChannels', 'adsCampaigns', 'adsRecent', 'adsMigration']) assert.ok(admin.includes('id="' + idn + '"'), idn);
  assert.match(read('frontend/assets/js/admin-analytics.js'), /renderAds\(data\.ads\)/);
  const sql = read('backend/migrations/20261023_ad_tracking.sql');
  for (const c of ['channel', 'campaign', 'is_ad', 'is_landing', 'booking_created']) assert.ok(sql.includes(c), c);
  assert.ok(read('Supabase-Setup-All.sql').includes('20261023_ad_tracking.sql'));
});
