/**
 * Standalone Edge-Case & Error Handling Stress Test Harness
 * Tests booking.js, payment.js, details.js, and cards.js against edge-case URLs.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

// Helper to create a mock DOM element
function createMockElement(tagName = 'div', id = '', className = '') {
  const children = [];
  const eventListeners = {};
  const style = {};
  const classList = {
    _classes: new Set(className ? className.split(/\s+/).filter(Boolean) : []),
    add(c) { this._classes.add(c); },
    remove(c) { this._classes.delete(c); },
    contains(c) { return this._classes.has(c); },
    toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
  };
  const dataset = {};

  const elem = {
    tagName: tagName.toUpperCase(),
    id,
    className,
    classList,
    dataset,
    style,
    value: '',
    checked: false,
    disabled: false,
    _textContent: '',
    _innerHTML: '',
    children,

    get textContent() {
      return this._textContent;
    },
    set textContent(val) {
      this._textContent = String(val);
      this._innerHTML = String(val);
    },

    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(val) {
      this._innerHTML = String(val);
      // Basic child parsing for .empty-state or div if needed
      children.length = 0;
      if (val.includes('empty-state')) {
        const emptyDiv = createMockElement('div', '', 'empty-state');
        emptyDiv.innerHTML = val;
        children.push(emptyDiv);
      }
    },

    appendChild(child) {
      child.parentElement = this;
      children.push(child);
      return child;
    },

    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      return child;
    },

    querySelector(selector) {
      if (selector === '.empty-state') {
        if (this.classList.contains('empty-state')) return this;
        for (const c of children) {
          const res = c.querySelector ? c.querySelector(selector) : null;
          if (res) return res;
        }
        if (this._innerHTML && this._innerHTML.includes('empty-state')) {
          return createMockElement('div', '', 'empty-state');
        }
        return null;
      }
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (this.classList.contains(cls)) return this;
        for (const c of children) {
          const res = c.querySelector ? c.querySelector(selector) : null;
          if (res) return res;
        }
      }
      return null;
    },

    querySelectorAll(selector) {
      const results = [];
      if (selector === '.card' || selector === '.empty-state') {
        const cls = selector.slice(1);
        if (this.classList.contains(cls)) results.push(this);
        for (const c of children) {
          if (c.querySelectorAll) results.push(...c.querySelectorAll(selector));
        }
      }
      return results;
    },

    closest(selector) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (this.classList.contains(cls)) return this;
      }
      return this.parentElement ? this.parentElement.closest(selector) : null;
    },

    addEventListener(event, handler) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    },

    dispatchEvent(event) {
      const handlers = eventListeners[event.type] || [];
      for (const h of handlers) h(event);
    },

    removeAttribute(attr) {},
    setAttribute(attr, val) {},
    getBoundingClientRect() {
      return { top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100 };
    }
  };

  return elem;
}

// Create a DOM environment for running scripts
function createBrowserEnvironment(urlStr, initialAuthToken = null) {
  const url = new URL(urlStr, 'http://localhost:3000');
  const elementsById = new Map();
  const listeners = {};
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarns = [];
  const unhandledErrors = [];

  const sessionStorageStore = new Map();
  const localStorageStore = new Map();

  const mockSessionStorage = {
    getItem(k) { return sessionStorageStore.get(k) || null; },
    setItem(k, v) { sessionStorageStore.set(k, String(v)); },
    removeItem(k) { sessionStorageStore.delete(k); },
    clear() { sessionStorageStore.clear(); }
  };

  const mockLocalStorage = {
    getItem(k) { return localStorageStore.get(k) || null; },
    setItem(k, v) { localStorageStore.set(k, String(v)); },
    removeItem(k) { localStorageStore.delete(k); },
    clear() { localStorageStore.clear(); }
  };

  // Pre-populate known booking / payment / details element IDs
  const knownIds = [
    'site-header', 'site-footer', 'bkImg', 'bkTitle', 'bkDate', 'bkPriceBase',
    'bkPriceBreakdown', 'bkTotalFinal', 'bkTotalStrike', 'payBtn', 'fPhone',
    'famName1', 'famName2', 'famName3', 'famName4', 'fGotram', 'fSankalpam',
    'noGotramCheck', 'whatsappHelp', 'namesRequired', 'payBtnPlaceholder',
    'payPuja', 'payAmount', 'pkg-steps', 'paidBtn', 'paymentBack', 'autopay-card',
    'enableAutopayBtn', 'skipAutopayBtn', 'autopayAmtLine', 'qrWrap', 'qrImg',
    'pdCaption', 'pdMantra', 'pdTitle', 'pdTemple', 'pdTempleLoc2', 'pdDate',
    'pdPrice', 'pdStickyName', 'pdStickyPrice', 'pdAbout', 'pdReadMore',
    'pdInfoTable', 'pdBenefits', 'pdProcedure', 'pdReceive', 'pdStickyRow',
    'pdStickyBook', 'pdBreadcrumbName', 'pujaCardsPage', 'tabsPage', 'searchPujas'
  ];

  for (const id of knownIds) {
    elementsById.set(id, createMockElement('div', id));
  }

  const mainElement = createMockElement('main', 'mainContent', 'pd-content');
  const bodyElement = createMockElement('body', 'body');
  bodyElement.appendChild(mainElement);

  const mockLocation = {
    _href: url.href,
    get href() { return this._href; },
    set href(v) { this._href = v; },
    get search() { return url.search; },
    set search(v) { url.search = v; this._href = url.href; },
    get pathname() { return url.pathname; },
    set pathname(v) { url.pathname = v; this._href = url.href; },
    replace(v) { this._href = v; },
    assign(v) { this._href = v; }
  };

  const mockDocument = {
    title: '',
    readyState: 'complete',
    body: bodyElement,
    getElementById(id) {
      if (!elementsById.has(id)) {
        elementsById.set(id, createMockElement('div', id));
      }
      return elementsById.get(id);
    },
    querySelector(selector) {
      if (selector === 'main') return mainElement;
      if (selector === '.pd-content') return mainElement;
      if (selector === 'body') return bodyElement;
      if (selector.startsWith('#')) return this.getElementById(selector.slice(1));
      return mainElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return mainElement.querySelectorAll(selector);
    },
    createElement(tag) {
      return createMockElement(tag);
    },
    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }
  };

  class MockIntersectionObserver {
    constructor(cb) { this.cb = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  const sandbox = {
    window: null,
    document: mockDocument,
    location: mockLocation,
    URL,
    URLSearchParams,
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
    IntersectionObserver: MockIntersectionObserver,
    authToken: initialAuthToken,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    alert: (msg) => {},
    console: {
      log: (...args) => consoleLogs.push(args.join(' ')),
      error: (...args) => {
        consoleErrors.push(args.join(' '));
      },
      warn: (...args) => consoleWarns.push(args.join(' ')),
      info: (...args) => consoleLogs.push(args.join(' '))
    },
    addEventListener: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener: (event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    },
    dispatchEvent: (event) => {
      const handlers = listeners[event.type] || [];
      for (const h of handlers) h(event);
    },
    api: async (url, method, data) => {
      return { ok: true, item: { price: 816, name: 'Mock' }, user: {} };
    }
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);

  // Load prerequisites: content files, main.js, language.js, navbar.js
  const pujasJs = fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8');
  const packagesJs = fs.readFileSync(path.join(FRONTEND_DIR, 'content/packages.js'), 'utf8');
  const defaultsJs = fs.readFileSync(path.join(FRONTEND_DIR, 'content/puja-detail-defaults.js'), 'utf8');
  const mainJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/main.js'), 'utf8');
  const langJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/language.js'), 'utf8');
  const navbarJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8');
  const cardsJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/cards.js'), 'utf8');

  vm.runInContext(pujasJs, context);
  vm.runInContext(packagesJs, context);
  vm.runInContext(defaultsJs, context);
  vm.runInContext(mainJs, context);
  vm.runInContext(langJs, context);
  vm.runInContext(navbarJs, context);
  vm.runInContext(cardsJs, context);

  return {
    context,
    sandbox,
    consoleErrors,
    consoleWarns,
    consoleLogs,
    unhandledErrors,
    mainElement,
    mockLocation,
    executeScript(filePath) {
      const code = fs.readFileSync(filePath, 'utf8');
      try {
        vm.runInContext(code, context);
      } catch (err) {
        unhandledErrors.push(err);
      }
    }
  };
}

async function runEdgeCaseTests() {
  console.log('================================================================');
  console.log('   EMPIRICAL EDGE-CASE & ERROR HANDLING STRESS TEST SUITE       ');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;
  const testResults = [];

  function record(id, name, pass, details) {
    if (pass) {
      passedTests++;
      console.log(`[PASS] ${id}: ${name}`);
    } else {
      failedTests++;
      console.log(`[FAIL] ${id}: ${name}`);
      console.log(`       -> Details: ${details}`);
    }
    testResults.push({ id, name, pass, details });
  }

  // -------------------------------------------------------------
  // TEST SET 1: booking.js with invalid/missing IDs
  // -------------------------------------------------------------
  console.log('--- TEST SET 1: booking.js with invalid / missing IDs ---');
  const bookingJsPath = path.join(FRONTEND_DIR, 'assets/js/booking.js');

  // Test 1.1: ?id=invalid123 (Logged out)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=invalid123', null);
    env.executeScript(bookingJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC1.1', 'booking.js with ?id=invalid123 redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.2: ?id=invalid123 (Logged in with active token)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=invalid123', 'fake-jwt-token-12345');
    env.executeScript(bookingJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC1.2', 'booking.js with ?id=invalid123 (authenticated) redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.3: ?id=undefined (Logged out)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=undefined', null);
    env.executeScript(bookingJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC1.3', 'booking.js with ?id=undefined redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.4: ?id=undefined (Logged in)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=undefined', 'fake-jwt-token-12345');
    env.executeScript(bookingJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC1.4', 'booking.js with ?id=undefined (authenticated) redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.5: ?id= (empty ID parameter, unauthenticated)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=', null);
    env.executeScript(bookingJsPath);
    const isRedirect = env.mockLocation.href.includes('login.html') || env.mockLocation.href === 'puja.html';
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 isRedirect;
    record('TC1.5', 'booking.js with ?id= (unauthenticated) triggers redirect with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.6: Missing ?id parameter completely (unauthenticated)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html', null);
    env.executeScript(bookingJsPath);
    const isRedirect = env.mockLocation.href.includes('login.html') || env.mockLocation.href === 'puja.html';
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 isRedirect;
    record('TC1.6', 'booking.js with missing ?id triggers redirect with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 1.7: ?id=puja:99999 (Non-existent array index)
  {
    const env = createBrowserEnvironment('http://localhost:3000/booking.html?id=puja:99999', 'fake-jwt');
    env.executeScript(bookingJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC1.7', 'booking.js with out-of-bounds index ?id=puja:99999 redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // -------------------------------------------------------------
  // TEST SET 2: payment.js with invalid IDs or missing bookingId
  // -------------------------------------------------------------
  console.log('\n--- TEST SET 2: payment.js with invalid IDs or missing bookingId ---');
  const paymentJsPath = path.join(FRONTEND_DIR, 'assets/js/pages/payment.js');

  // Test 2.1: payment.html with no parameters
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.1', 'payment.js with no query parameters redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 2.2: payment.html with valid id but missing bookingId
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html?id=puja:0', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.2', 'payment.js with missing bookingId (?id=puja:0) redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 2.3: payment.html with empty bookingId (?bookingId=&id=puja:0)
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html?bookingId=&id=puja:0', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.3', 'payment.js with empty bookingId (?bookingId=&id=puja:0) redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 2.4: payment.html with valid bookingId but invalid id (?bookingId=123456&id=invalid123)
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html?bookingId=123456&id=invalid123', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.4', 'payment.js with invalid puja ID (?bookingId=123456&id=invalid123) redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 2.5: payment.html with valid bookingId but id=undefined
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html?bookingId=123456&id=undefined', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.5', 'payment.js with ?bookingId=123456&id=undefined redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 2.6: payment.html with valid bookingId and out-of-range index (?bookingId=123456&id=puja:9999)
  {
    const env = createBrowserEnvironment('http://localhost:3000/payment.html?bookingId=123456&id=puja:9999', 'fake-jwt');
    env.executeScript(paymentJsPath);
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 env.mockLocation.href === 'puja.html';
    record('TC2.6', 'payment.js with ?bookingId=123456&id=puja:9999 redirects to puja.html with 0 exceptions', pass,
      `redirect=${env.mockLocation.href}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // -------------------------------------------------------------
  // TEST SET 3: details.js with invalid puja ID
  // -------------------------------------------------------------
  console.log('\n--- TEST SET 3: details.js with invalid puja ID ---');
  const detailsJsPath = path.join(FRONTEND_DIR, 'assets/js/pages/details.js');

  // Test 3.1: details.html with invalid puja ID (?id=non_existent_puja_999)
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja-details.html?id=non_existent_puja_999', null);
    env.executeScript(detailsJsPath);
    const html = env.mainElement.innerHTML;
    const hasPujaNotFound = html.includes('Puja not found') && html.includes('puja.html');
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 hasPujaNotFound;
    record('TC3.1', 'details.js with invalid ID (?id=non_existent_puja_999) renders friendly fallback with 0 exceptions', pass,
      `hasFallback=${hasPujaNotFound}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 3.2: details.html with ?id=undefined
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja-details.html?id=undefined', null);
    env.executeScript(detailsJsPath);
    const html = env.mainElement.innerHTML;
    const hasPujaNotFound = html.includes('Puja not found') && html.includes('puja.html');
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 hasPujaNotFound;
    record('TC3.2', 'details.js with ?id=undefined renders friendly fallback with 0 exceptions', pass,
      `hasFallback=${hasPujaNotFound}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 3.3: details.html with ?id=puja:99999
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja-details.html?id=puja:99999', null);
    env.executeScript(detailsJsPath);
    const html = env.mainElement.innerHTML;
    const hasPujaNotFound = html.includes('Puja not found') && html.includes('puja.html');
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 hasPujaNotFound;
    record('TC3.3', 'details.js with out-of-range index ?id=puja:99999 renders friendly fallback with 0 exceptions', pass,
      `hasFallback=${hasPujaNotFound}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // Test 3.4: details.html with XSS injection probe ?id=<script>alert(1)</script>
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja-details.html?id=%3Cscript%3Ealert(1)%3C%2Fscript%3E', null);
    env.executeScript(detailsJsPath);
    const html = env.mainElement.innerHTML;
    const hasPujaNotFound = html.includes('Puja not found');
    const pass = env.unhandledErrors.length === 0 &&
                 env.consoleErrors.length === 0 &&
                 hasPujaNotFound;
    record('TC3.4', 'details.js with XSS probe ID safely renders fallback with 0 exceptions', pass,
      `hasFallback=${hasPujaNotFound}, errors=${env.consoleErrors.length}, unhandled=${env.unhandledErrors.map(e => e.message).join('; ')}`);
  }

  // -------------------------------------------------------------
  // TEST SET 4: category filter empty states in cards.js
  // -------------------------------------------------------------
  console.log('\n--- TEST SET 4: category filter empty states in cards.js ---');

  // Test 4.1: Direct invocation of renderCards with a category having 0 pujas
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja.html', null);
    const container = env.sandbox.document.createElement('div');
    container.id = 'pujaCardsPage';
    // Call renderCards with category 'NonExistentCategory'
    vm.runInContext("renderCards(container, pujas, 'puja', 'NonExistentCategory')", Object.assign(env.context, { container }));

    const emptyElem = container.querySelector('.empty-state');
    const innerHtml = container.innerHTML;
    const hasEmptyState = Boolean(emptyElem) || innerHtml.includes('empty-state');
    const hasMessage = innerHtml.includes('No pujas found in this category');
    const pass = hasEmptyState && hasMessage && env.unhandledErrors.length === 0 && env.consoleErrors.length === 0;

    record('TC4.1', 'cards.js renderCards creates .empty-state container when 0 items match filter', pass,
      `hasEmptyState=${hasEmptyState}, hasMessage=${hasMessage}, errors=${env.consoleErrors.length}`);
  }

  // Test 4.2: Category filter with empty list ([]), verifying .empty-state
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja.html', null);
    const container = env.sandbox.document.createElement('div');
    container.id = 'testContainer';
    vm.runInContext("renderCards(container, [], 'puja', 'All')", Object.assign(env.context, { container }));

    const innerHtml = container.innerHTML;
    const hasEmptyState = innerHtml.includes('empty-state');
    const pass = hasEmptyState && env.unhandledErrors.length === 0 && env.consoleErrors.length === 0;

    record('TC4.2', 'cards.js renderCards with empty list renders .empty-state container', pass,
      `hasEmptyState=${hasEmptyState}, innerHTML=${innerHtml.slice(0, 100)}...`);
  }

  // Test 4.3: Category filter for 'Health' when no English pujas are in Health category
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja.html', null);
    const container = env.sandbox.document.createElement('div');
    vm.runInContext("currentLang = 'en'; renderCards(container, pujas, 'puja', 'Health')", Object.assign(env.context, { container }));

    const innerHtml = container.innerHTML;
    const hasEmptyState = innerHtml.includes('empty-state');
    const pass = hasEmptyState && env.unhandledErrors.length === 0;

    record('TC4.3', 'cards.js filter Health category (0 matching pujas) renders .empty-state container', pass,
      `hasEmptyState=${hasEmptyState}`);
  }

  // Test 4.4: Category filter for 'Career' when no Telugu pujas are in Career category
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja.html', null);
    const container = env.sandbox.document.createElement('div');
    vm.runInContext("currentLang = 'te'; renderCards(container, pujas, 'puja', 'Career')", Object.assign(env.context, { container }));

    const innerHtml = container.innerHTML;
    const hasEmptyState = innerHtml.includes('empty-state');
    const pass = hasEmptyState && env.unhandledErrors.length === 0;

    record('TC4.4', 'cards.js filter Career category in Telugu (0 matching pujas) renders .empty-state container', pass,
      `hasEmptyState=${hasEmptyState}`);
  }

  // Test 4.5: Tab switching via wireTabs leading to empty category renders .empty-state
  {
    const env = createBrowserEnvironment('http://localhost:3000/puja.html', null);
    const container = env.sandbox.document.createElement('div');
    container.id = 'pujaCardsPage';
    const tabs = env.sandbox.document.createElement('div');
    tabs.id = 'tabsPage';

    const tabAll = env.sandbox.document.createElement('button', '', 'tab active');
    tabAll.dataset.cat = 'All';
    const tabHealth = env.sandbox.document.createElement('button', '', 'tab');
    tabHealth.dataset.cat = 'Health';

    tabs.appendChild(tabAll);
    tabs.appendChild(tabHealth);

    env.sandbox.document.getElementById = (id) => {
      if (id === 'tabsPage') return tabs;
      if (id === 'pujaCardsPage') return container;
      return createMockElement('div', id);
    };

    vm.runInContext("currentLang = 'en'; wireTabs('tabsPage', container, pujas, 'puja')", Object.assign(env.context, { container, tabs }));

    // Simulate clicking tabHealth
    const clickEvent = {
      type: 'click',
      target: tabHealth
    };
    tabs.dispatchEvent(clickEvent);

    const innerHtml = container.innerHTML;
    const hasEmptyState = innerHtml.includes('empty-state');
    const pass = hasEmptyState && env.unhandledErrors.length === 0;

    record('TC4.5', 'wireTabs click event to empty category renders .empty-state container', pass,
      `hasEmptyState=${hasEmptyState}`);
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS : ${passedTests + failedTests}`);
  console.log(`PASSED      : ${passedTests}`);
  console.log(`FAILED      : ${failedTests}`);
  console.log(`VERDICT     : ${failedTests === 0 ? 'APPROVE' : 'REJECT'}`);
  console.log('================================================================');

  return { passedTests, failedTests, testResults };
}

runEdgeCaseTests().then(res => {
  if (res.failedTests > 0) process.exit(1);
  process.exit(0);
}).catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
