const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const promo = require('../backend/utils/promo');

const base = { code: 'SALE', kind: 'percent', value: 10, scope: 'all', audience: 'anyone', active: true };
const item = { id: 'moksha', name: 'Moksha Puja', price: 1000 };
const ok = (p, extra = {}) => promo.evaluatePromo({ promo: { ...promo.sanitizePromo(p), ...extra }, item, phone: '9876543210', usage: {}, hasPaidBefore: false });

test('promo: percentage, flat, cap and the Rs 1 minimum', () => {
  assert.equal(ok(base).finalPrice, 900);
  assert.equal(ok({ ...base, maxOff: 50 }).off, 50);
  assert.equal(ok({ ...base, kind: 'flat', value: 250 }).finalPrice, 750);
  assert.equal(ok({ ...base, kind: 'flat', value: 5000 }).finalPrice, 1);        // never free
  assert.equal(ok({ ...base, value: 100 }).finalPrice, 1);
  assert.match(ok(base).label, /10% off/);
});

test('promo: sanitising the admin form', () => {
  assert.equal(promo.sanitizePromo({ ...base, code: ' ss145xu00as ' }).code, 'SS145XU00AS');
  assert.throws(() => promo.sanitizePromo({ ...base, code: 'a' }), /3-24/);
  assert.throws(() => promo.sanitizePromo({ ...base, value: 0 }), /discount/i);
  assert.throws(() => promo.sanitizePromo({ ...base, value: 150 }), /100/);
  assert.throws(() => promo.sanitizePromo({ ...base, scope: 'selected', items: [] }), /puja/i);
  assert.throws(() => promo.sanitizePromo({ ...base, audience: 'phone', phone: '123' }), /mobile/i);
  assert.equal(promo.sanitizePromo({ ...base, audience: 'phone', phone: '+91 98765 43210' }).phone, '9876543210');
  assert.throws(() => promo.sanitizePromo({ ...base, startsAt: '2026-11-02', expiresAt: '2026-11-01' }), /after/);
});

test('promo: scope, audience, dates and limits', () => {
  assert.equal(ok({ ...base, scope: 'selected', items: ['moksha'] }).ok, true);
  assert.equal(ok({ ...base, scope: 'selected', items: ['Moksha Puja'] }).ok, true);
  assert.equal(ok({ ...base, scope: 'selected', items: ['other'] }).ok, false);
  assert.equal(ok({ ...base, audience: 'phone', phone: '9876543210' }).ok, true);
  assert.equal(ok({ ...base, audience: 'phone', phone: '9123456780' }).ok, false);
  const firstTime = promo.sanitizePromo({ ...base, code: 'FIRST', audience: 'first_time' });
  assert.equal(promo.evaluatePromo({ promo: firstTime, item, phone: '9876543210', usage: {}, hasPaidBefore: false }).ok, true);
  assert.match(promo.evaluatePromo({ promo: firstTime, item, phone: '9876543210', usage: {}, hasPaidBefore: true }).error, /first-time/);
  assert.match(ok({ ...base, active: false }).error, /not active/);
  assert.match(ok({ ...base, expiresAt: '2020-01-01' }).error, /expired/);
  assert.match(ok({ ...base, startsAt: '2999-01-01' }).error, /not active yet/);
  const limited = promo.sanitizePromo({ ...base, maxUses: 2 });
  assert.match(promo.evaluatePromo({ promo: limited, item, phone: '9876543210', usage: { total: 2, byPhone: 0 } }).error, /limit/);
  assert.match(promo.evaluatePromo({ promo: limited, item, phone: '9876543210', usage: { total: 0, byPhone: 1 } }).error, /already used/);
  assert.match(promo.evaluatePromo({ promo: null, item }).error, /not valid/);
});

test('promo: generated codes, the booking note and the expected price', () => {
  for (let i = 0; i < 50; i++) assert.match(promo.generateCode(), /^SS[A-HJKMNP-Z2-9]{8}$/);
  const r = ok(base);
  const line = promo.promoNoteLine(r);
  assert.deepEqual(promo.parsePromoNote('Puja: x\n' + line + '\nFamily: y'), { code: 'SALE', off: 100, list: 1000 });
  assert.equal(promo.parsePromoNote('nothing here'), null);
  assert.equal(promo.expectedPrice(1000, { off: 100 }), 900);
  assert.equal(promo.expectedPrice(1000, null), 1000);
});

test('promo: stored locally when there is no database; a booking with a code is priced, counted and limited', () => {
  /* runs in a child process with Supabase switched off, so no real database is ever touched */
  const script = `
    const fs = require('fs'), path = require('path'), assert = require('assert');
    const root = ${JSON.stringify(path.join(__dirname, '..'))};
    const files = ['bookings.json', 'promos.json', 'users.json', 'devotees.json'].map(f => path.join(root, 'backend', f));
    const backup = files.map(f => fs.existsSync(f) ? fs.readFileSync(f) : null);
    const { Readable } = require('stream');
    const mk = (body, phone) => { const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.headers = {}; r.userPhone = phone; return r; };
    const mkres = () => { const o = { status: 0, body: null }; o.writeHead = s => { o.status = s; }; o.setHeader = () => {}; o.end = d => { try { o.body = JSON.parse(d); } catch (e) {} }; o.req = { headers: {} }; return o; };
    (async () => {
      const promo = require(root + '/backend/utils/promo'), model = require(root + '/backend/models/promoModel');
      const ctl = require(root + '/backend/controllers/promoController'), bc = require(root + '/backend/controllers/bookingController');
      const bm = require(root + '/backend/models/bookingModel');
      const bf = require(root + '/backend/controllers/bookingFormController');
      bf.loadForm = async () => ({ revision: 'r1', schema: { fields: [], labels: {}, optional: {} } });
      const { pujas } = require(root + '/frontend/content/pujas.js'); const it = pujas[0];
      const p = promo.sanitizePromo({ code: 'TESTFIRST', kind: 'percent', value: 10, audience: 'first_time' });
      await model.create(p);
      await assert.rejects(() => model.create(p), /already exists/);
      await model.update({ ...p, value: 20 }); assert.equal((await model.get('testfirst')).value, 20);
      await model.update({ ...p, value: 10 });
      let r = mkres(); await ctl.validate(mk({ code: 'testfirst', ref: it.id }, '9876543210'), r);
      assert.equal(r.status, 200); assert.equal(r.body.finalPrice, it.price - Math.floor(it.price / 10));
      r = mkres(); await ctl.validate(mk({ code: 'nope', ref: it.id }, '9876543210'), r); assert.equal(r.status, 400);
      r = mkres(); await bc.create(mk({ ref: it.id, puja: it.name, price: it.price, name: 'T', phone: '9876543210', gotram: 'K', family: 'A', bookingDetails: {}, formRevision: 'r1', promoCode: 'testfirst' }, '9876543210'), r);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const b = await bm.findById(r.body.id);
      assert.equal(b.price, it.price - Math.floor(it.price / 10)); assert.equal(b.promo.code, 'TESTFIRST');
      assert.equal(promo.expectedPrice(it.price, b.promo), b.price);
      assert.equal((await model.usage('TESTFIRST', '9876543210')).byPhone, 1);
      r = mkres(); await ctl.validate(mk({ code: 'testfirst', ref: it.id }, '9876543210'), r); assert.equal(r.status, 400);   // one use per devotee
      r = mkres(); await bc.create(mk({ ref: it.id, puja: it.name, price: it.price + 1, name: 'T', phone: '9876543210', family: 'A', bookingDetails: {}, formRevision: 'r1', promoCode: 'testfirst' }, '9876543210'), r);
      assert.equal(r.status, 409);                                                                                          // a tampered list price is still refused
      await model.remove('TESTFIRST'); assert.equal(await model.get('TESTFIRST'), null);
      console.log('LOCAL-OK');
    })().catch(e => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; })
      .finally(() => files.forEach((f, i) => { if (backup[i]) fs.writeFileSync(f, backup[i]); else if (fs.existsSync(f)) fs.unlinkSync(f); }));
  `;
  const out = require('node:child_process').spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', ALLOW_LOCAL_DATA: 'true' }, encoding: 'utf8', timeout: 30000
  });
  assert.match(out.stdout, /LOCAL-OK/, out.stdout + out.stderr);
});

test('puja discount: only a real discount is drawn; no discount shows the plain price', () => {
  const ctx = {}; vm.createContext(ctx);
  const src = read('frontend/assets/js/cards.js');
  const start = src.indexOf('function ssDiscountInfo'), end = src.indexOf('const templeIcon');
  vm.runInContext(src.slice(start, end), ctx);
  assert.deepEqual({ ...ctx.ssDiscountInfo({ price: 800, detail: { originalPrice: 1000, discountPercent: 20 } }) }, { orig: 1000, price: 800, pct: 20 });
  assert.equal(ctx.ssDiscountInfo({ price: 1000, detail: {} }), null);
  assert.equal(ctx.ssDiscountInfo({ price: 1000 }), null);
  assert.equal(ctx.ssDiscountInfo({ price: 1200, detail: { originalPrice: 1000 } }), null);   // never a "negative" discount
  assert.equal(ctx.ssDiscountInfo({ price: 999, detail: { originalPrice: 1000 } }), null);    // under 1% is not shown
  const cards = read('frontend/assets/js/cards.js');
  assert.match(cards, /price-was/); assert.match(cards, /% OFF/);
  assert.match(read('frontend/assets/js/pages/details.js'), /ssDiscountInfo\(item\)/);
});

test('puja discount: admin saves the discounted price as the price and keeps the original', () => {
  const admin = read('frontend/assets/js/admin.js');
  assert.match(admin, /p\.detail\.originalPrice = basePrice/);
  assert.match(admin, /delete p\.detail\.originalPrice/);
  assert.match(admin, /editPujaDiscount/);
  assert.ok(read('backend/admin.html').includes('id="editPujaDiscount"'));
});

test('promo codes are wired end to end', () => {
  const api = read('backend/routes/api.js');
  for (const r of ['/api/promo/validate', '/api/admin/promos', '/api/admin/promos/generate']) assert.ok(api.includes(r), r);
  assert.match(read('backend/controllers/bookingController.js'), /checkCode\(/);
  assert.match(read('backend/controllers/bookingController.js'), /price: payPrice/);
  assert.match(read('backend/controllers/paymentController.js'), /expectedPrice\(currentItem\.price, booking\.promo\)/);
  assert.match(read('frontend/assets/js/booking.js'), /promoCode: promo \? promo\.code : ""/);
  assert.match(read('frontend/assets/js/pages/payment.js'), /existingBooking\.price/);
  const admin = read('backend/admin.html');
  assert.ok(admin.includes('data-target="view-promos"') && admin.includes('id="view-promos"') && admin.includes('admin-promos.js'));
  const sql = read('backend/migrations/20261028_promo_codes.sql');
  assert.match(sql, /ss_promo_codes/);
  assert.match(read('Supabase-Setup-All.sql'), /ss_promo_codes/);
  assert.match(read('.gitignore'), /backend\/\*\.json/);   // local promos.json is never committed
});

test('a personal code can hold many mobile numbers and works only for those', () => {
  const p = promo.sanitizePromo({ ...base, audience: 'phone', phone: '9876543210, 9123456780\n+91 90000 00001, 9876543210' });
  assert.deepEqual(p.phones, ['9876543210', '9123456780', '9000000001']);
  assert.equal(p.phone, '9876543210,9123456780,9000000001');
  assert.equal(ok({ ...base, audience: 'phone', phone: '9123456780\n9876543210' }).ok, true);
  assert.equal(ok({ ...base, audience: 'phone', phone: '9123456780\n9000000001' }).ok, false);
  assert.throws(() => promo.sanitizePromo({ ...base, audience: 'phone', phone: '9876543210, 12345' }), /not valid/i);
  assert.throws(() => promo.sanitizePromo({ ...base, audience: 'phone', phone: '  ' }), /at least one/i);
  /* a code read back from storage (comma list only) still works */
  assert.deepEqual(promo.promoPhones({ phone: '9876543210,9123456780' }), ['9876543210', '9123456780']);
});

test('a code stops at the exact time it was given, not at the end of the day', () => {
  const p = { ...promo.sanitizePromo({ ...base, expiresAt: '2026-11-01T18:30:00+05:30' }) };
  const at = t => promo.evaluatePromo({ promo: p, item, phone: '9876543210', usage: {}, now: t });
  assert.equal(at('2026-11-01T18:29:59+05:30').ok, true);
  assert.match(at('2026-11-01T18:30:01+05:30').error, /expired/);
});
