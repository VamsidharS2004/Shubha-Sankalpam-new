/**
 * Test 1: booking.js edge-case handling
 * Validates invalid/missing IDs produce proper redirects and 0 console errors / TypeErrors.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

function createEnv(searchQuery, authToken = null) {
  const url = new URL('http://localhost:3000/booking.html' + searchQuery);
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
        checked: false,
        disabled: false,
        textContent: '',
        innerHTML: '',
        addEventListener: () => {}
      });
    }
    return elements.get(id);
  };

  const sandbox = {
    window: null,
    document: {
      getElementById: getOrCreate,
      addEventListener: () => {},
      readyState: 'complete'
    },
    location: mockLocation,
    URL,
    URLSearchParams,
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    authToken,
    IntersectionObserver: class { observe() {} },
    setTimeout: (fn) => setTimeout(fn, 0),
    alert: () => {},
    console: {
      error: (...args) => consoleErrors.push(args.join(' ')),
      warn: () => {},
      log: () => {}
    },
    addEventListener: () => {},
    api: async () => ({ ok: true, item: { price: 11, name: 'Puja' }, user: {} })
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);

  // Load prerequisites
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/packages.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/main.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/language.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8'), ctx);

  // Execute booking.js
  const bookingCode = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/booking.js'), 'utf8');
  try {
    vm.runInContext(bookingCode, ctx);
  } catch (e) {
    unhandled.push(e);
  }

  return { mockLocation, consoleErrors, unhandled };
}

function run() {
  console.log('Running test_booking_redirects.js...');
  
  // 1. ?id=invalid123 (unauthenticated)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?id=invalid123', null);
    assert.strictEqual(mockLocation.href, 'puja.html', 'Should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Should have 0 console errors');
    assert.strictEqual(unhandled.length, 0, 'Should have 0 unhandled exceptions');
    console.log('  ✓ ?id=invalid123 redirects to puja.html with 0 errors');
  }

  // 2. ?id=invalid123 (authenticated)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?id=invalid123', 'fake-token');
    assert.strictEqual(mockLocation.href, 'puja.html', 'Should redirect to puja.html when authenticated');
    assert.strictEqual(consoleErrors.length, 0, 'Should have 0 console errors');
    assert.strictEqual(unhandled.length, 0, 'Should have 0 unhandled exceptions');
    console.log('  ✓ ?id=invalid123 (authenticated) redirects to puja.html with 0 errors');
  }

  // 3. ?id=undefined
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?id=undefined', null);
    assert.strictEqual(mockLocation.href, 'puja.html', 'Should redirect to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Should have 0 console errors');
    assert.strictEqual(unhandled.length, 0, 'Should have 0 unhandled exceptions');
    console.log('  ✓ ?id=undefined redirects to puja.html with 0 errors');
  }

  // 4. ?id= (empty ID)
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('?id=', null);
    assert.ok(mockLocation.href.includes('login.html') || mockLocation.href === 'puja.html', 'Should redirect');
    assert.strictEqual(consoleErrors.length, 0, 'Should have 0 console errors');
    assert.strictEqual(unhandled.length, 0, 'Should have 0 unhandled exceptions');
    console.log('  ✓ ?id= triggers clean redirect with 0 errors');
  }

  // 5. Missing ?id
  {
    const { mockLocation, consoleErrors, unhandled } = createEnv('', null);
    assert.ok(mockLocation.href.includes('login.html') || mockLocation.href === 'puja.html', 'Should redirect');
    assert.strictEqual(consoleErrors.length, 0, 'Should have 0 console errors');
    assert.strictEqual(unhandled.length, 0, 'Should have 0 unhandled exceptions');
    console.log('  ✓ Missing ?id triggers clean redirect with 0 errors');
  }

  console.log('All booking.js edge-case tests PASSED.\n');
}

run();
