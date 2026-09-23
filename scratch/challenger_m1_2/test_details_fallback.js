/**
 * Test 3: details.js edge-case handling
 * Validates invalid puja IDs result in graceful fallback card and ZERO unhandled exceptions.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

function createEnv(searchQuery) {
  const url = new URL('http://localhost:3000/puja-details.html' + searchQuery);
  const elements = new Map();
  const consoleErrors = [];
  const unhandled = [];

  const mainElement = {
    tagName: 'MAIN',
    className: 'pd-content',
    innerHTML: '',
    style: {}
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
        appendChild: () => {}
      });
    }
    return elements.get(id);
  };

  const sandbox = {
    window: null,
    document: {
      title: '',
      getElementById: getOrCreate,
      querySelector: (sel) => {
        if (sel === 'main' || sel === '.pd-content' || sel === 'body') return mainElement;
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: () => {},
      readyState: 'complete'
    },
    location: {
      search: url.search,
      href: url.href,
      pathname: url.pathname
    },
    URL,
    URLSearchParams,
    localStorage: { getItem: () => 'en', setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    authToken: null,
    setTimeout: (fn) => setTimeout(fn, 0),
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    console: {
      error: (...args) => consoleErrors.push(args.join(' ')),
      warn: () => {},
      log: () => {}
    },
    addEventListener: () => {},
    api: async () => ({ ok: true })
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);

  // Load prerequisites
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/packages.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/puja-detail-defaults.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/main.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/language.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8'), ctx);

  // Execute details.js
  const detailsCode = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/pages/details.js'), 'utf8');
  try {
    vm.runInContext(detailsCode, ctx);
  } catch (e) {
    unhandled.push(e);
  }

  return { mainElement, consoleErrors, unhandled };
}

function run() {
  console.log('Running test_details_fallback.js...');

  // 1. Invalid puja ID string (?id=invalid_id_123)
  {
    const { mainElement, consoleErrors, unhandled } = createEnv('?id=invalid_id_123');
    assert.ok(mainElement.innerHTML.includes('Puja not found'), 'Should render "Puja not found" heading');
    assert.ok(mainElement.innerHTML.includes('puja.html'), 'Should provide link back to puja.html');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ ?id=invalid_id_123 renders graceful error card with 0 exceptions');
  }

  // 2. ?id=undefined
  {
    const { mainElement, consoleErrors, unhandled } = createEnv('?id=undefined');
    assert.ok(mainElement.innerHTML.includes('Puja not found'), 'Should render "Puja not found" heading');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ ?id=undefined renders graceful error card with 0 exceptions');
  }

  // 3. Out-of-bounds index ?id=puja:99999
  {
    const { mainElement, consoleErrors, unhandled } = createEnv('?id=puja:99999');
    assert.ok(mainElement.innerHTML.includes('Puja not found'), 'Should render "Puja not found" heading');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ ?id=puja:99999 renders graceful error card with 0 exceptions');
  }

  // 4. Out-of-bounds package index ?id=pkg:99999
  {
    const { mainElement, consoleErrors, unhandled } = createEnv('?id=pkg:99999');
    assert.ok(mainElement.innerHTML.includes('Puja not found'), 'Should render "Puja not found" heading');
    assert.strictEqual(consoleErrors.length, 0, 'Zero console errors');
    assert.strictEqual(unhandled.length, 0, 'Zero unhandled exceptions');
    console.log('  ✓ ?id=pkg:99999 renders graceful error card with 0 exceptions');
  }

  console.log('All details.js edge-case tests PASSED.\n');
}

run();
