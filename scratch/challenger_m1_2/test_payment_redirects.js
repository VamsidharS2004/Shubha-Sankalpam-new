/**
 * Test 2: payment.js edge-case handling
 * Validates invalid IDs or missing bookingId produce redirect to puja.html and 0 console errors / TypeErrors.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

function createEnv(searchQuery) {
  const url = new URL('http://localhost:3000/payment.html' + searchQuery);
  const elements = new Map();
  const consoleErrors = [];
  const unhandled = [];

  const mockLocation = {
    _href: url.href,
    get href() { return this._href; },
    set href(v) { this._href = v; },
    get search() { return url.search; },
    pathname: url.pathname
  };

  const getOrCreate = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        style: {},
        value: '',
        textContent: '',
        innerHTML: '',
        addEventListener: () => {},
        removeAttribute: () => {}
      });
    }
    return elements.get(id);
  };

  const sandbox = {
    window: null,
    document: {
      getElementById: getOrCreate,
      querySelectorAll: () => [],
      addEventListener: () => {},
      readyState: 'complete'
    },
    location: mockLocation,
    URL,
    URLSearchParams,
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} },
    authToken: 'dummy-token',
    setTimeout: (fn) => setTimeout(fn, 0),
    alert: () => {},
    console: {
      error: (...args) => consoleErrors.push(args.join(' ')),
      warn: () => {},
      log: () => {}
    },
    addEventListener: () => {},
    api: async () => ({ ok: true, user: {} })
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);

  // Load prerequisites
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/packages.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/main.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8'), ctx);

  // Execute payment.js
  const paymentCode = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/pages/payment.js'), 'utf8');
  try {
    vm.runInContext(paymentCode, ctx);
  } catch (e) {
    unhandled.push(e);
  }

  return { mockLocation, consoleErrors, unhandled };
}

function run() {
  console.log('Running test_payment_redirects.js...');

  // 1. Missing bookingId and missing id
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Missing bookingId should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ Missing all params redirects to puja.html with 0 errors');
  }

  // 2. Missing bookingId with valid id (?id=puja:0)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?id=puja:0');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Missing bookingId should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ Missing bookingId (?id=puja:0) redirects to puja.html with 0 errors');
  }

  // 3. Empty bookingId (?bookingId=&id=puja:0)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?bookingId=&id=puja:0');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Empty bookingId should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ Empty bookingId redirects to puja.html with 0 errors');
  }

  // 4. Valid bookingId with invalid puja ID (?bookingId=123456&id=invalid123)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?bookingId=123456&id=invalid123');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Invalid puja ID should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ Invalid puja ID (?bookingId=123456&id=invalid123) redirects to puja.html with 0 errors');
  }

  // 5. Valid bookingId with id=undefined (?bookingId=123456&id=undefined)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?bookingId=123456&id=undefined');
    assert.strictEqual(mockLocation.href, 'puja.html', 'id=undefined should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ id=undefined redirects to puja.html with 0 errors');
  }

  // 6. Valid bookingId with out-of-bounds index (?bookingId=123456&id=puja:9999)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?bookingId=123456&id=puja:9999');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Out-of-bounds index should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ Out-of-bounds index redirects to puja.html with 0 errors');
  }

  console.log('All payment.js edge-case tests PASSED.\n');
}

run();
