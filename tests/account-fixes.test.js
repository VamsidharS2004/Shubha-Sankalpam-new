const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('privacy and terms pages have no contents list and name the grievance officer', () => {
  for (const f of ['frontend/privacy.html', 'frontend/terms.html']) assert.ok(!/<nav class="legal-toc"/.test(read(f)), f + ' still has the contents list');
  assert.match(read('frontend/privacy.html'), /<strong>Name:<\/strong> Linga Reddy/);
  assert.ok(!/\[GRIEVANCE OFFICER NAME\]/.test(read('frontend/privacy.html')));
});

function loadController(model) {
  const modelPath = require.resolve('../backend/models/bookingModel');
  const saved = require.cache[modelPath];
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: model };
  const ctrlPath = require.resolve('../backend/controllers/bookingController');
  delete require.cache[ctrlPath];
  const ctrl = require(ctrlPath);
  return { ctrl, restore() { delete require.cache[ctrlPath]; if (saved) require.cache[modelPath] = saved; else delete require.cache[modelPath]; } };
}
function call(fn, req, query) {
  return new Promise(resolve => {
    const res = { writeHead(code) { this.code = code; }, setHeader() {}, end(body) { resolve({ code: this.code, body: JSON.parse(body || '{}') }); } };
    fn({ headers: {}, userPhone: '+919999999999', ...req }, res, new URL('http://x/api/bookings?' + query));
  });
}

test('a customer can remove a booking that is waiting for payment; it is kept, not erased', async () => {
  const updates = [];
  const rows = { p1: { id: 'p1', phone: '+919999999999', status: 'Pending', payment_status: 'Pending' } };
  const { ctrl, restore } = loadController({ findFullById: async id => rows[id] || null, updateBooking: async (id, d) => { updates.push([id, d]); return true; } });
  try {
    const r = await call(ctrl.deleteMyBooking, {}, 'id=p1');
    assert.equal(r.code, 200); assert.equal(r.body.ok, true);
    assert.deepEqual(updates, [['p1', { status: 'Cancelled by user' }]]);
  } finally { restore(); }
});

test('paid bookings and other people\'s bookings cannot be removed', async () => {
  const rows = {
    paid: { id: 'paid', phone: '+919999999999', status: 'Paid', payment_status: 'Paid' },
    claimed: { id: 'claimed', phone: '+919999999999', status: 'Pending', payment_status: 'Pending Verification' },
    other: { id: 'other', phone: '+910000000000', status: 'Pending', payment_status: 'Pending' }
  };
  const updates = [];
  const { ctrl, restore } = loadController({ findFullById: async id => rows[id] || null, updateBooking: async (...a) => { updates.push(a); return true; } });
  try {
    assert.equal((await call(ctrl.deleteMyBooking, {}, 'id=paid')).code, 409);
    assert.equal((await call(ctrl.deleteMyBooking, {}, 'id=claimed')).code, 409);
    assert.equal((await call(ctrl.deleteMyBooking, {}, 'id=other')).code, 404);
    assert.equal((await call(ctrl.deleteMyBooking, {}, 'id=missing')).code, 404);
    assert.equal(updates.length, 0);
  } finally { restore(); }
});

test('removed bookings are hidden from the customer list but still returned to the admin', () => {
  const model = read('backend/models/bookingModel.js');
  assert.equal((model.match(/cancelled by user/gi) || []).length >= 2, true);
  assert.match(model, /async function getUserBookings[\s\S]*cancelled by user[\s\S]*cancelled by user/i);
});

test('account avatar skips Mr./Mrs./Dr./Sri titles', () => {
  const html = read('frontend/account.html');
  const m = /window\.ssInitial = function[\s\S]*?\n    };/.exec(html);
  assert.ok(m, 'ssInitial missing');
  const ctx = { window: { Intl }, Intl, Array, String };
  vm.runInNewContext(m[0], ctx);
  const f = ctx.window.ssInitial;
  assert.equal(f('Mr. Konduru sai goutham'), 'S');
  assert.equal(f('Mr. Konduru Sai Kumar'), 'S');
  assert.equal(f('Ramesh Kumar'), 'R');
  assert.equal(f('Mrs. lakshmi'), 'L');
  assert.equal(f('Dr Ravi'), 'R');
  assert.equal(f('Sri Ram'), 'R');
  assert.equal(f('Mr. M'), 'M');
  assert.equal(f('sai goutham'), 'S');
  assert.equal(f('శ్రీ రాజు'), 'రా');
  assert.equal(f(''), 'D');
  assert.equal(f('Mr.'), 'D');
});

test('account page shows at once: no waiting for the catalog scripts, early profile request, skeleton bookings', () => {
  const html = read('frontend/account.html');
  assert.match(html, /html:not\(\.ss-has-token\) \.account-banner/);
  assert.match(html, /window\.__meP = fetch\("\/api\/me"/);
  assert.match(html, /class="bk-skel"/);
  assert.ok(!/Loading profile/.test(html));
  assert.match(read('frontend/assets/js/pages/account.js'), /window\.__meP/);
});

test('privacy policy has no "Last updated" line', () => {
  assert.ok(!/Last updated on/i.test(read('frontend/privacy.html')));
  assert.ok(!/class="last-updated"/.test(read('frontend/privacy.html')));
});

test('Telugu text is baked into listing pages and the early-text script is on every page', () => {
  const puja = read('frontend/puja.html');
  assert.match(puja, /data-i18n-list="hero_h1">పవిత్ర/);
  assert.match(puja, /id="searchPujas" placeholder="మీరు/);
  assert.match(puja, /html\.ss-i18n-pending:not\(\[lang="te"\]\) \[data-i18n-list\]/);
  for (const f of ['home', 'puja', 'package', 'account', 'puja-details', 'login']) {
    assert.match(read(`frontend/${f}.html`), /ss-early:start/, f);
  }
});

test('account detail fields start blank (shimmer or cached), never default placeholder text', () => {
  const html = read('frontend/account.html');
  assert.match(html, /<div id="dashEmail"><\/div>/);
  assert.match(html, /<div id="dashGotram"><\/div>/);
  assert.match(html, /<div id="dashLang"><\/div>/);
  assert.match(html, /set\("dashEmail"/);
});

/* ---- bell + pending list share one rule ---- */
function loadBookingRules(catalog) {
  const src = read('frontend/assets/js/main.js');
  const a = src.indexOf('function ssNormStatus'), b = src.indexOf('/* which puja/package does a "ref"');
  assert.ok(a > 0 && b > a, 'shared booking rules missing from main.js');
  const ctx = { pujas: catalog, packages: [] };
  vm.runInNewContext(src.slice(a, b) + '\nthis.rules = { ssNormStatus, ssBookingListed, ssPendingBookings };', ctx);
  return ctx.rules;
}
const bk = (id, puja, status) => ({ id, puja, status });

test('pending bookings of a disabled puja are hidden, and come back when the puja is enabled again', () => {
  const live = [{ id: '001', name: 'Moksha', name_te: 'మోక్ష', language: 'te' }];
  const r1 = loadBookingRules(live);
  const list = [bk('1', 'Moksha', 'Pending'), bk('2', 'Disabled Puja', 'payment-pending')];
  assert.deepEqual(r1.ssPendingBookings(list).map(b => b.id), ['1']);
  const r2 = loadBookingRules([...live, { id: '002', name: 'Disabled Puja', language: 'te' }]); // enabled again
  assert.deepEqual(r2.ssPendingBookings(list).map(b => b.id), ['1', '2']);
  const r3 = loadBookingRules([]); // catalog failed to load: never hide anything
  assert.equal(r3.ssPendingBookings(list).length, 2);
});

test('the bell never counts removed, paid or finished bookings', () => {
  const r = loadBookingRules([{ id: '001', name: 'Moksha', language: 'te' }]);
  const list = [bk('1', 'Moksha', 'Cancelled by user'), bk('2', 'Moksha', 'paid'), bk('3', 'Moksha', 'video-sent'), bk('4', 'Moksha', 'failed')];
  assert.deepEqual(r.ssPendingBookings(list).map(b => b.id), ['4']);
  assert.equal(r.ssNormStatus('Cancelled by user'), 'removed');
});

test('bell and account page both use the shared rule; bell paints from the saved profile', () => {
  const nav = read('frontend/assets/js/navbar.js'), acct = read('frontend/assets/js/pages/account.js');
  assert.match(nav, /ssPendingBookings\(me && me\.bookings\)/);
  assert.match(nav, /paintAbandonedBell\(cached\)/);
  assert.ok(!/b\.status === "Pending" \|\| b\.status === "payment-pending"/.test(nav), 'old separate bell rule is back');
  assert.match(acct, /ssNormStatus\(b\.status\)/);
  assert.match(acct, /ssBookingListed\(b\)/);
});

test('account panel from a link (bell) shows at once, no hidden-then-appear gap, no smooth-scroll delay', () => {
  const html = read('frontend/account.html'), acct = read('frontend/assets/js/pages/account.js');
  assert.match(html, /html\[data-start-panel="bookings"\] #panel-bookings/);
  assert.ok(!/ss-account-routing/.test(html + acct));
  assert.ok(!/behavior: "smooth"/.test(acct));
  assert.ok(!/setTimeout\(\(\) => \{\s*selected\.setAttribute/.test(acct));
});

test('hero photo box is never white while the photo downloads', () => {
  assert.match(read('frontend/assets/css/hero.css'), /\.hero-image-wrap picture[^{]*\{ background-color: #f3e6d3/);
});

test('the build step that reads navbar.js still runs (a new top-level line in navbar.js must not break npm run build)', () => {
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(process.execPath, ['scripts/prerender-header.js'], { cwd: require('node:path').resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

/* ---- speed: photos asked for early, catalog never makes a visitor wait long ---- */
test('every page head is valid JavaScript and asks for remembered photos early', () => {
  for (const f of ['home', 'puja', 'package', 'puja-details', 'account']) {
    const html = read(`frontend/${f}.html`);
    const head = /<script>\s*\(function\(\)\{var d=document\.documentElement[\s\S]*?<\/script>/.exec(html);
    assert.ok(head, f + ': head script missing');
    assert.doesNotThrow(() => new Function(head[0].replace(/^<script>|<\/script>$/g, '')), f + ': head script is not valid JavaScript');
    assert.match(head[0], /ss_img_hints/);
    assert.ok(!/\/\/puja/.test(head[0]), f + ': a "/" inside the head script was swallowed');
  }
  const cards = read('frontend/assets/js/cards.js');
  assert.match(cards, /rememberImageHints\(type, shown\)/);
});

test('the remembered-photo preload uses the same picture the card will use (no double download)', () => {
  const head = /<script>\s*\(function\(\)\{var d=document\.documentElement[\s\S]*?<\/script>/.exec(read('frontend/puja.html'))[0].replace(/^<script>|<\/script>$/g, '');
  const links = [];
  const fakeDoc = { documentElement: { classList: { add() {}, remove() {} } }, head: { appendChild: l => links.push(l) }, addEventListener() {}, createElement: () => ({ setAttribute(k, v) { this[k] = v; } }) };
  const img = 'https://abc.supabase.co/storage/v1/object/public/media/pujas/x.webp';
  const ctx = { document: fakeDoc, window: { addEventListener() {} }, location: { pathname: '/puja.html' }, setTimeout() {}, Intl,
    localStorage: { getItem: k => k === 'ss_img_hints' ? JSON.stringify({ puja: [img], byId: {} }) : null, setItem() {} } };
  vm.runInNewContext(head, ctx);
  assert.equal(links.length >= 1, true);
  const l = links.find(x => x.imagesrcset);
  assert.ok(l, 'no image preload created');
  assert.match(l.imagesrcset, /render\/image\/public\/media\/pujas\/x\.webp\?width=800&resize=contain&quality=70 800w/);
  assert.equal(l.imagesizes, '(max-width: 767px) 92vw, 420px'); // identical to cards.js
  assert.match(read('frontend/assets/js/cards.js'), /"\(max-width: 767px\) 92vw, 420px"/);
});

test('catalog: short wait for the database and visible timing', () => {
  const s = read('backend/server.js');
  assert.match(s, /WARM_WAIT_MS = 300/);
  assert.match(s, /Server-Timing/);
  assert.match(read('scripts/check-live.js'), /phone-size photos all load quickly/);
});

test('sync-catalog never exits straight after a network call (Windows libuv crash stopped npm run build)', () => {
  const s = read('scripts/sync-catalog.js');
  assert.ok(!/^\s*process\.exit\(0\);/m.test(s), 'process.exit must be delayed');
  assert.match(s, /setTimeout\(\(\) => process\.exit\(0\), 300\)/);
});

/* ---- opening a puja: no fade, no gray placeholder, photo + title + price from the first frame ---- */
function headScriptOf(file) {
  return /<script>\s*\(function\(\)\{var d=document\.documentElement[\s\S]*?<\/script>/.exec(read(`frontend/${file}`))[0].replace(/^<script>|<\/script>$/g, '');
}
function runHead(file, pathname, search, hints, lang) {
  const win = { addEventListener() {} };
  const ctx = { document: { documentElement: { lang, classList: { add() {}, remove() {} } }, head: { appendChild() {} }, addEventListener() {}, createElement: () => ({ setAttribute() {} }) },
    window: win, location: { pathname, search }, setTimeout() {}, Intl, URLSearchParams, decodeURIComponent,
    localStorage: { getItem: k => k === 'ss_img_hints' ? JSON.stringify(hints) : k === 'ss_lang' ? lang : null, setItem() {} } };
  ctx.window = ctx; ctx.addEventListener = () => {};
  vm.runInNewContext(headScriptOf(file), ctx);
  return ctx.__ssHint;
}
const IMG = 'https://abc.supabase.co/storage/v1/object/public/media/pujas/x.webp';
const HINTS = { puja: [IMG], byId: { '002': IMG }, meta: { '002': { l: 'te', t: 'శ్రీ రాజశ్యామల – చండీ హోమం', p: 816 } } };

test('puja page knows the remembered title, price and photo before any script loads', () => {
  const h = runHead('puja-details.html', '/puja-details/002', '', HINTS, 'te');
  assert.equal(h.t, 'శ్రీ రాజశ్యామల – చండీ హోమం');
  assert.equal(h.p, 816);
  assert.match(h.s, /render\/image\/public\/media\/pujas\/x\.webp\?width=800&resize=contain&quality=70 800w/);
  assert.equal(h.z, '(max-width: 900px) 100vw, 60vw');
});

test('a remembered title in another language, or for another puja, is never shown', () => {
  assert.equal(runHead('puja-details.html', '/puja-details/002', '', HINTS, 'en'), undefined);
  assert.equal(runHead('puja-details.html', '/puja-details/003', '', HINTS, 'te'), undefined);
  assert.equal(runHead('puja-details.html', '/puja-details/002', '', { puja: [], byId: {} }, 'te'), undefined);
});

test('booking page also gets the remembered title and price from its ?id=', () => {
  const h = runHead('booking.html', '/booking.html', '?id=002', HINTS, 'te');
  assert.equal(h.t, 'శ్రీ రాజశ్యామల – చండీ హోమం');
  assert.equal(h.p, 816);
});

function runPaint(hint, wide) {
  const html = read('frontend/puja-details.html');
  const m = /<script>\/\* Paint what is remembered[\s\S]*?<\/script>/.exec(html);
  assert.ok(m, 'paint script missing');
  assert.ok(html.indexOf(m[0]) > html.indexOf('id="pdPrice"') && html.indexOf(m[0]) > html.indexOf('id="cdS"'), 'must run after the elements exist');
  assert.ok(html.indexOf(m[0]) < html.indexOf('<script defer src="content/site-settings.js'), 'must run before the deferred scripts');
  const els = {}; const mk = () => ({ children: [], style: {}, appendChild(c) { this.children.push(c); }, setAttribute() {}, classList: { add() {} } });
  ['pdSlides', 'pdTitle', 'pdPrice', 'pdCaption', 'pdBreadcrumbName', 'cdD', 'cdH', 'cdM', 'cdS', 'muhuratRow'].forEach(id => els[id] = mk());
  const classes = [];
  const doc = { getElementById: id => els[id], createElement: mk, documentElement: { classList: { add: c => classes.push(c) } } };
  const ctx = { document: doc, window: { __ssHint: hint }, Number, Intl, String, Math, Date, matchMedia: () => ({ matches: wide }) };
  ctx.window.matchMedia = ctx.matchMedia;
  vm.runInNewContext(m[0].replace(/^<script>|<\/script>$/g, ''), ctx, {});
  return { els, classes };
}

test('puja page paints the remembered photo, title, price and countdown at once, and details.js replaces them in one step', () => {
  const soon = Date.now() + (2 * 864e5) + (3 * 36e5) + 5e3;
  const r = runPaint({ t: 'Title', p: 816, m: soon, i: IMG, s: 'u480 480w, u800 800w', z: 'sizes' }, true);
  assert.equal(r.els.pdTitle.textContent, 'Title');
  assert.equal(r.els.pdPrice.textContent, '₹816');
  assert.equal(r.els.pdCaption.textContent, 'TITLE');
  assert.equal(r.els.pdBreadcrumbName.textContent, 'Title');
  assert.equal(r.els.pdSlides.children.length, 1);
  assert.equal(r.els.pdSlides.children[0].style.backgroundImage, 'url(u480)', 'the small photo already downloaded for the card shows underneath');
  assert.equal(r.els.cdD.textContent, '02');
  assert.equal(r.els.cdH.textContent, '03');
  assert.equal(r.els.muhuratRow.style.display, '');
  assert.ok(r.classes.includes('pd-hinted') && r.classes.includes('pd-hint-card'));
  // no countdown time known, or a phone: the booking card stays hidden until the real page is ready (it would jump otherwise)
  assert.ok(!runPaint({ t: 'Title', p: 816, m: 0, i: IMG }, true).classes.includes('pd-hint-card'));
  assert.ok(!runPaint({ t: 'Title', p: 816, m: soon, i: IMG }, false).classes.includes('pd-hint-card'));
  // a puja whose photo is not a Supabase picture still gets its title and price at once
  const noPhoto = runPaint({ t: 'Title', p: 5, m: 0, i: '' }, true);
  assert.equal(noPhoto.els.pdTitle.textContent, 'Title');
  assert.equal(noPhoto.els.pdSlides.children.length, 0);
  const css = read('frontend/assets/css/puja-details.css');
  assert.match(css, /html\.pd-booting\.pd-hinted \.pd-skel\{display:none\}/);
  assert.match(css, /html\.pd-booting\.pd-hinted \.pd-content > \.pd-hero-section:not\(\.pd-skel\)\{visibility:visible\}/);
  assert.match(css, /@media \(min-width:901px\)\{html\.pd-booting\.pd-hinted\.pd-hint-card \.pd-hero-right\{visibility:visible\}\}/);
  assert.match(css, /html\.pd-booting #pdBook\{pointer-events:none\}/);
  assert.match(read('frontend/assets/js/pages/details.js'), /slidesEl\.replaceChildren\(\.\.\.builtSlides\)/);
});

test('every card and the home banner remember title, price, photo and muhurat for the next page (even a puja with no real photo, or a photo that is a file of the site)', () => {
  const cards = read('frontend/assets/js/cards.js');
  const grab = n => { const i = cards.indexOf('function ' + n); assert.ok(i > -1, n); let d = 0, j = cards.indexOf('{', i); for (let k = j; k < cards.length; k++) { if (cards[k] === '{') d++; if (cards[k] === '}' && --d === 0) return cards.slice(i, k + 1); } };
  const store = {};
  const ctx = { currentLang: 'te', localName: p => p.name, Date, JSON, Object, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
  vm.runInNewContext(['pujaHint', 'saveHints', 'rememberImageHints', 'rememberPujaHints'].map(grab).join('\n'), ctx);
  const list = [
    { id: '001', name: 'A', price: 10, image: IMG, muhurat: '2030-01-01T00:00:00.000Z' },
    { id: 'నవ-హోమం', name: 'B', price: 20, image: 'bhairava' },
    { id: '007', name: 'C', price: 30, image: 'assets/images/pujas/narasimha.webp' }
  ];
  ctx.rememberImageHints('puja', list.map(ctx.pujaHint));
  let h = JSON.parse(store.ss_img_hints);
  assert.deepEqual(h.puja, [IMG], 'only real photos are preloaded');
  assert.equal(h.meta['001'].m, Date.parse('2030-01-01T00:00:00.000Z'));
  assert.deepEqual(h.meta['నవ-హోమం'], { l: 'te', t: 'B', p: 20, m: 0 }, 'a puja whose image is only a theme name still has its title and price remembered');
  assert.equal(h.byId['నవ-హోమం'], undefined);
  assert.equal(h.byId['007'], 'assets/images/pujas/narasimha.webp', 'a photo that is a file of the site is remembered too');
  ctx.rememberPujaHints([{ id: '009', name: 'Hero', price: 7, image: IMG }]);
  h = JSON.parse(store.ss_img_hints);
  assert.equal(h.meta['009'].t, 'Hero');
  assert.deepEqual(h.puja, [IMG], 'banner pujas do not replace the list of card photos');
  const home = read('frontend/assets/js/pages/home.js');
  assert.equal((home.match(/rememberPujaHints\(topPujas\)/g) || []).length, 2, 'both ways of showing the banner remember its pujas');
});

test('pages swap in one step: no cross-fade (washed-out frames), and puja pages are loaded ahead by Chrome', () => {
  for (const f of ['home', 'puja', 'package', 'puja-details', 'booking', 'account']) {
    const h = read(`frontend/${f}.html`);
    assert.match(h, /::view-transition-old\(root\),::view-transition-new\(root\)\{animation:none/, f);
    assert.ok(!/view-transition-new\(root\)\{animation-duration/.test(h), f + ': fade is back');
    assert.match(h, /"prerender":\[\{"where":\{"href_matches":"\/puja-details\/\*"\},"eagerness":"moderate"\}\]/, f);
  }
  const main = read('frontend/assets/js/main.js');
  assert.match(main, /function ssAfterActivation/);
  assert.match(main, /prerender: \[\{ urls: seen, eagerness: "eager" \}\]/);
});

test('a page Chrome loaded ahead is only counted as a visit when the visitor opens it', () => {
  assert.match(read('frontend/assets/js/analytics-tracker.js'), /document\.prerendering\)document\.addEventListener\('prerenderingchange'/);
  assert.match(read('frontend/assets/js/pages/details.js'), /ssAfterActivation\(\(\) => \{\s*api\('\/api\/me\/interest'/);
});

test('booking summary never shows "Puja Title" or Rs 0 while loading', () => {
  const b = read('frontend/booking.html');
  assert.match(b, /html\.bk-booting #bkTitle[^{]*\{visibility:hidden\}/);
  assert.match(b, /classList\.add\("bk-booting"\)/);
  assert.match(read('frontend/assets/js/booking.js'), /classList\.remove\("bk-booting"\)/);
  assert.match(read('frontend/assets/js/cards.js'), /h\.meta\[x\.id\] = \{ l: currentLang, t: x\.t, p: x\.p, m: x\.m \|\| 0 \}/);
});

test('first visit: live pujas are baked into the puja and booking pages and the head script uses them', () => {
  const src = read('scripts/prerender-header.js');
  assert.match(src, /ss_fonts_ok"\)\|\|d\.lang==="te"/);            // Telugu font is requested at once, even on a first visit
  for (const f of ['frontend/puja-details.html', 'frontend/booking.html']) {
    const h = read(f);
    assert.ok(h.indexOf('window.__ssBaked=') > -1 && h.indexOf('window.__ssBaked=') < h.indexOf('<!-- ss-head:start'), f);
    assert.match(h, /window\.__ssBaked=\{[^<]*\};<\/script>/);
  }
  assert.ok(!/__ssBaked=/.test(read('frontend/home.html')));
  // run the head script as a first-time visitor (nothing in localStorage) with a baked entry
  const head = read('frontend/puja-details.html');
  const m = head.match(/<script>\s*\(function\(\)\{var d=document\.documentElement,l="te"[\s\S]*?<\/script>/);
  assert.ok(m, 'head script found');
  const code = m[0].replace(/^<script>|<\/script>$/g, '');
  const links = [];
  const doc = { documentElement: { lang: '', classList: { add() {}, remove() {} } }, head: { appendChild: l => links.push(l) }, addEventListener() {},
    createElement: () => ({ setAttribute(k, v) { this[k] = v; } }), fonts: null, querySelector: () => null };
  const win = { addEventListener() {}, __ssBaked: { '002': { t: 'శీర్షిక', p: 816, m: 1, i: IMG } } };
  vm.runInNewContext(code, { document: doc, window: win, localStorage: { getItem: () => null, setItem() {} }, setTimeout() {}, location: { pathname: '/puja-details/002', search: '' },
    URLSearchParams, decodeURIComponent, JSON, String });
  assert.equal(win.__ssHint && win.__ssHint.t, 'శీర్షిక');
  assert.equal(win.__ssHint.p, 816);
  assert.ok(links.some(l => l.as === 'image' && /width=800/.test(l.imagesrcset)), 'photo preloaded on a first visit');
  assert.ok(links.some(l => l.as === 'font'), 'Telugu font preloaded');
});

test('"Your Booking Details" opens the details directly: the Scan & Pay card stays hidden until the details are drawn', () => {
  const h = read('frontend/payment.html');
  assert.match(h, /html\.ss-pay-history:not\(\.ss-payment-ready\) \.pay-card\{visibility:hidden\}/);
  assert.match(h, /view=details\(&\|\$\)/);
  assert.ok(h.indexOf('ss-pay-history') < h.indexOf('<div class="container form-page">'), 'runs before the card is painted');
  assert.match(h, /setTimeout\(function\(\)\{d\.classList\.remove\("ss-pay-history"\);\},6000\)/);   // can never stay hidden
  assert.match(read('frontend/assets/js/pages/account.js'), /view=details/);
  assert.match(read('frontend/assets/js/pages/payment.js'), /classList\.add\('ss-payment-ready'\)/);
});

test('first-load speed: scroll-reveal measures before it writes, and far-below sections are laid out only near the viewport', () => {
  const a = read('frontend/assets/js/animations.js');
  assert.match(a, /var staggerOn = staggers\.map\(onScreen\), revealOn = reveals\.map\(onScreen\)/);
  assert.match(a, /scanQueued/);
  assert.ok(!/function alreadyOnScreen/.test(a));
  assert.match(read('frontend/assets/css/home.css'), /\.cv-below\{content-visibility:auto;contain-intrinsic-size:auto 640px\}/);
  const home = read('frontend/home.html');
  for (const id of ['why-us', 'temples', 'testimonials', 'faq']) assert.match(home, new RegExp(`class="section cv-below" id="${id}"`));
  assert.ok(!/cv-below[^>]*id="(pujas|top)"/.test(home), 'the banner and the pujas list are never deferred');
});
