const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

// Every external dependency is stubbed: no database writes or messages.
const staged = fs.existsSync(path.join(__dirname, 'bookingModel.js'));
const backend = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(staged
  ? path.join(__dirname, path.basename(file)) : path.join(backend, file), 'utf8');
function load(code, mocks, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, __dirname,
    require: name => {
      if (name in mocks) return mocks[name];
      if (['fs', 'path', 'crypto'].includes(name)) return require(name);
      throw new Error('Unexpected dependency: ' + name);
    },
    console: { log() {}, error() {} }, process: { env: {} },
    AbortSignal, ...globals
  });
  return module.exports;
}
const record = {
  id: 'booking-test', price: 1, devotee_phone: '9999999999',
  notes: 'Puja: Test Puja\nrazorpay_order:order_test',
  booking_names: [{ name: 'Test Devotee' }]
};
const templates = load(source('utils/paymentTemplates.js'), {
  '../../frontend/content/pujas': { pujas: [{ name: 'Test Puja', muhurat: '2026-09-25T09:00:00+05:30', temple: 'Test Temple' }] }
});
test('template fallback does not invent schedule or failure details', () => {
  const booking = { ...record, name: 'Test', puja: 'Unknown catalogue entry' };
  const success = templates.paymentTemplateParams(booking, {});
  assert.equal(success.length, 8);
  assert.equal(success[2], 'To be confirmed');
  assert.equal(success[3], 'To be confirmed');
  assert.equal(success[4], 'To be confirmed');
  const failed = templates.paymentTemplateParams(booking, {}, true);
  assert.equal(failed.length, 7);
  assert.equal(failed[3], 'Not available');
  assert.equal(failed[5], 'Payment could not be completed');
  assert.equal(failed[6], '9121296262');
});
function bookingModel(remote) {
  const query = {
    select(fields) {
      assert.match(fields, /notes/);
      assert.match(fields, /booking_names/);
      return this;
    },
    ilike() { return this; },
    async limit() { return { data: [record], error: null }; }
  };
  return load(source('models/bookingModel.js'), {
    '../utils/supabase': { supabase: remote ? { from: () => query } : null },
    '../utils/http': { clean: value => value },
    fs: { readFileSync: () => JSON.stringify([record]) }
  });
}
for (const remote of [false, true]) {
  test(`order lookup supplies notification fields (${remote ? 'Supabase' : 'local'})`, async () => {
    const booking = await bookingModel(remote).findByOrderId('order_test');
    assert.equal(booking.phone, record.devotee_phone);
    assert.equal(booking.userPhone, record.devotee_phone);
    assert.equal(booking.name, 'Test Devotee');
    assert.equal(booking.puja, 'Test Puja');
  });
}
function whatsapp(fetch, key = 'fake-key') {
  return load(source('utils/whatsapp.js'), { '../config': { AISENSY_API_KEY: key } }, { fetch });
}
test('missing phone is handled without a request or exception', async () => {
  const api = whatsapp(() => { throw new Error('Must not call network'); });
  assert.equal(await api.sendAiSensyMessage(undefined, 'campaign'), false);
});
test('missing credentials or template values do not send', async () => {
  const fetch = () => { throw new Error('Must not call network'); };
  assert.equal(await whatsapp(fetch, '').sendAiSensyMessage(record.devotee_phone, 'campaign'), false);
  assert.equal(await whatsapp(fetch).sendAiSensyMessage(record.devotee_phone, 'campaign', 'Test', [undefined]), false);
});
test('HTTP and network errors return false', async () => {
  for (const fetch of [async () => ({ ok: false, status: 400 }), async () => { throw new Error('timeout'); }]) {
    assert.equal(await whatsapp(fetch).sendAiSensyMessage(record.devotee_phone, 'campaign'), false);
  }
});
for (const eventName of ['payment.captured', 'payment.failed']) {
  test(`${eventName} sends complete template values and acknowledges webhook`, async () => {
    let payload, status, marked = false;
    const sender = whatsapp(async (_url, options) => {
      payload = JSON.parse(options.body);
      assert.ok(options.signal);
      return { ok: true };
    });
    const model = bookingModel(true);
    model.markPaid = model.setStatus = async () => { marked = true; };
    const controller = load(source('controllers/paymentController.js'), {
      '../utils/whatsapp': sender,
      '../utils/paymentTemplates': templates,
      '../utils/http': { send: (_res, code) => { status = code; } },
      '../config': { RAZORPAY_WEBHOOK_SECRET: 'test-secret' },
      '../models/bookingModel': model
    });
    const raw = JSON.stringify({ event: eventName, payload: { payment: { entity: { id: 'pay_test', order_id: 'order_test', amount: 100, method: 'upi', error_description: 'Bank declined the transaction' } } } });
    await controller.webhook({ _rawBody: raw, headers: {
      'x-razorpay-signature': crypto.createHmac('sha256', 'test-secret').update(raw).digest('hex')
    } }, {});
    assert.equal(marked, true);
    assert.equal(status, 200);
    assert.equal(payload.destination, '919999999999');
    assert.equal(payload.userName, 'Test Devotee');
    assert.deepEqual(payload.templateParams, eventName === 'payment.captured'
      ? ['Test Devotee', 'Test Puja', '25 September 2026', '09:00 am IST', 'Test Temple', 'booking-test', '1.00', 'UPI']
      : ['Test Devotee', 'Test Puja', 'booking-test', '1.00', 'UPI', 'Bank declined the transaction', '9121296262']);
  });
}
