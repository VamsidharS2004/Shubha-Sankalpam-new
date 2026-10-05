const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const staged = path.join(__dirname, 'bookingModel.js');
const code = fs.readFileSync(fs.existsSync(staged) ? staged : path.join(__dirname, '../models/bookingModel.js'), 'utf8');
function model(remote, initial) {
  let rows = [{ id: 'booking-1', notes: initial, devotee_phone: '9999999999' }];
  const query = {
    select() { return this; }, eq() { return this; },
    async single() { return { data: { ...rows[0] } }; },
    update(values) { return { eq: async () => { Object.assign(rows[0], values); return { error: null }; } }; },
    async order() { return { data: rows }; }
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, __dirname, console, require(name) {
    if (name === 'fs') return {
      readFileSync: () => JSON.stringify(rows),
      writeFileSync: (_file, content) => { rows = JSON.parse(content); }
    };
    if (name === 'path') return path;
    if (name === '../utils/supabase') return { supabase: remote ? { from: () => query } : null };
    if (name === '../utils/http') return { clean: value => value };
    throw new Error(name);
  } });
  return { api: module.exports, rows: () => rows };
}
for (const remote of [false, true]) {
  test(`payment preserves puja and order metadata and repeat events (${remote})`, async () => {
    const state = model(remote, 'Puja: Test Homam\nFamily: Test\nrazorpay_order:order_1');
    await state.api.markPaid('booking-1', 'pay_1');
    await state.api.markPaid('booking-1', 'pay_1');
    assert.equal(state.rows()[0].notes, 'Puja: Test Homam\nFamily: Test\nrazorpay_order:order_1\nrazorpay_payment:pay_1');
    assert.equal((await state.api.all())[0].puja, 'Test Homam');
  });
  test(`payment-only legacy notes are not a puja name (${remote})`, async () => {
    const state = model(remote, 'razorpay_payment:pay_old');
    assert.equal((await state.api.all())[0].puja, 'Puja name unavailable');
  });
  test(`admin booking list exposes the complete submitted form (${remote})`, async () => {
    const details = { devoteeNames: ["Rama", "Sita"], gotram: "Kashyap", sankalpam: "Health and peace", whatsapp: "+919999999999" };
    const state = model(remote, `BookingID: 123456\nPuja: Test Homam\nWhatsApp: 9999999999\nBookingDetails: ${JSON.stringify(details)}`);
    const booking = (await state.api.all())[0];
    assert.equal(booking.puja, "Test Homam");
    assert.deepEqual(JSON.parse(JSON.stringify(booking.bookingDetails)), details);
  });
}
