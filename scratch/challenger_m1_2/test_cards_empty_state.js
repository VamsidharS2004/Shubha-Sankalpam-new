/**
 * Test 4: cards.js category filter empty-state handling
 * Validates that filtering by categories yielding 0 matches renders .empty-state container.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

function createEnv() {
  const elements = new Map();
  const consoleErrors = [];

  function createElem(tag, className = '') {
    const children = [];
    return {
      tagName: tag.toUpperCase(),
      className,
      classList: {
        add: (c) => {},
        remove: (c) => {},
        contains: (c) => className.split(' ').includes(c)
      },
      style: {},
      children,
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = v; children.length = 0; },
      appendChild(child) { children.push(child); return child; },
      querySelector(sel) {
        if (sel === '.empty-state') {
          return children.find(c => c.className === 'empty-state') || null;
        }
        return null;
      }
    };
  }

  const sandbox = {
    window: null,
    document: {
      createElement: (tag) => createElem(tag),
      getElementById: (id) => elements.get(id) || null
    },
    localStorage: { getItem: () => 'en', setItem: () => {} },
    console: {
      error: (...args) => consoleErrors.push(args.join(' ')),
      warn: () => {},
      log: () => {}
    }
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);

  // Load prerequisites
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'content/packages.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/main.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/language.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/cards.js'), 'utf8'), ctx);

  return { ctx, sandbox, createElem, consoleErrors };
}

function run() {
  console.log('Running test_cards_empty_state.js...');
  const { ctx, sandbox, createElem, consoleErrors } = createEnv();

  // 1. Direct renderCards with empty list
  {
    const container = createElem('div', 'cards');
    vm.runInContext("renderCards(container, [], 'puja', 'All')", Object.assign(ctx, { container }));
    const emptyChild = container.querySelector('.empty-state');
    assert.ok(emptyChild, 'Container must have a child with class .empty-state');
    assert.strictEqual(emptyChild.className, 'empty-state');
    assert.ok(emptyChild.innerHTML.includes('No pujas found'), 'Empty state must have friendly text');
    console.log('  ✓ renderCards([]) renders .empty-state container');
  }

  // 2. Filter by 'Health' category in English (0 pujas in dataset belong to Health)
  {
    const container = createElem('div', 'cards');
    vm.runInContext("currentLang = 'en'; renderCards(container, pujas, 'puja', 'Health')", Object.assign(ctx, { container }));
    const emptyChild = container.querySelector('.empty-state');
    assert.ok(emptyChild, 'Container must render .empty-state when category yields 0 matches');
    assert.strictEqual(emptyChild.className, 'empty-state');
    console.log('  ✓ Category "Health" in English (0 items) renders .empty-state container');
  }

  // 3. Filter by non-existent category
  {
    const container = createElem('div', 'cards');
    vm.runInContext("renderCards(container, pujas, 'puja', 'NonExistentCategory')", Object.assign(ctx, { container }));
    const emptyChild = container.querySelector('.empty-state');
    assert.ok(emptyChild, 'Container must render .empty-state for unknown category');
    assert.strictEqual(emptyChild.className, 'empty-state');
    console.log('  ✓ Non-existent category renders .empty-state container');
  }

  // 4. Filter by 'Wealth' category in English (Wealth pujas in DB are Telugu)
  {
    const container = createElem('div', 'cards');
    vm.runInContext("currentLang = 'en'; renderCards(container, pujas, 'puja', 'Wealth')", Object.assign(ctx, { container }));
    const emptyChild = container.querySelector('.empty-state');
    assert.ok(emptyChild, 'Container must render .empty-state for Wealth category in English');
    assert.strictEqual(emptyChild.className, 'empty-state');
    console.log('  ✓ Category "Wealth" in English (0 English items) renders .empty-state container');
  }

  assert.strictEqual(consoleErrors.length, 0, 'Zero console errors during cards empty-state testing');
  console.log('All cards.js empty-state tests PASSED.\n');
}

run();
