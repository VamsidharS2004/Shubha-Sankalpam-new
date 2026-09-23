/**
 * Auditor M1 Forensic Verification Script
 * Independently verifies all Milestone 1 deliverables and integrity constraints.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '../..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// ==========================================
// 1. CSS Responsive & Layout Hardening (F01-F04, F13, F14)
// ==========================================

check('F01: Fixed Mobile Widget Coordination', () => {
  const respCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/responsive.css'), 'utf8');
  const formsCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/forms.css'), 'utf8');
  const pdCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/puja-details.css'), 'utf8');
  const navJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8');

  // Verify floating-wa offset in responsive.css
  assert.ok(respCss.includes('.floating-wa { bottom: 85px;'), 'floating-wa must be offset above bottom-nav (85px)');
  
  // Verify abandoned-fab suppression in responsive.css
  assert.ok(respCss.includes('body:has(.pd-sticky-bottom) .abandoned-fab'), 'abandoned-fab must be suppressed in details');
  assert.ok(respCss.includes('body:has(.booking-layout) .abandoned-fab'), 'abandoned-fab must be suppressed in booking');

  // Verify forms.css floating-wa elevation
  assert.ok(formsCss.includes('body:has(.booking-layout) .floating-wa'), 'forms.css must raise floating-wa in booking-layout');
  assert.ok(formsCss.includes('bottom: calc(148px + env(safe-area-inset-bottom))'), 'forms.css floating-wa elevation must be 148px');

  // Verify puja-details.css floating-wa elevation
  assert.ok(pdCss.includes('.floating-wa {'), 'puja-details.css must elevate floating-wa');
  assert.ok(pdCss.includes('bottom: calc(150px + env(safe-area-inset-bottom, 0px))'), 'puja-details.css elevation must be 150px');

  // Verify navbar.js suppression logic
  assert.ok(navJs.includes('if (currentPath.includes("puja-details") || currentPath.includes("booking") || currentPath.includes("payment"))'), 'navbar.js must suppress abandoned-fab on funnel pages');
});

check('F02: Mobile Sticky Pill & Telugu Text Containment (375px)', () => {
  const pdCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/puja-details.css'), 'utf8');
  
  assert.ok(pdCss.includes('.pd-sticky-bottom {'), 'puja-details.css must define .pd-sticky-bottom');
  assert.ok(pdCss.includes('max-width: calc(100vw - 24px)'), 'must constrain max-width on 768px');
  assert.ok(pdCss.includes('@media (max-width: 480px)'), 'must include 480px media query');
  assert.ok(pdCss.includes('max-width: calc(100vw - 16px)'), 'must constrain max-width on 480px');
  assert.ok(pdCss.includes('.pd-sb-icon {\n    display: none;'), 'must hide icon on 480px to save space for Telugu text');
  assert.ok(pdCss.includes('max-width: 80px;'), 'must clamp h4 width on 480px');
});

check('F03: Mobile Hero Slider Height Stabilization', () => {
  const heroCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/hero.css'), 'utf8');
  
  assert.ok(heroCss.includes('.hero-slider {'), 'hero.css must style .hero-slider');
  assert.ok(heroCss.includes('height: 780px !important;'), 'hero-slider must enforce 780px fixed height');
  assert.ok(heroCss.includes('min-height: 780px !important;'), 'hero-slider must enforce min-height 780px');
  assert.ok(heroCss.includes('max-height: 780px !important;'), 'hero-slider must enforce max-height 780px');
  assert.ok(heroCss.includes('overflow: hidden;'), 'hero-slider must hide overflow to prevent layout jumps');
});

check('F04: Carousel Dot Navigation Restoration', () => {
  const homeHtml = fs.readFileSync(path.join(FRONTEND_DIR, 'home.html'), 'utf8');
  const homeCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/home.css'), 'utf8');
  const homeJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/pages/home.js'), 'utf8');

  assert.ok(homeHtml.includes('id="pujaDots"'), 'home.html must include #pujaDots container');
  assert.ok(homeCss.includes('.puja-dots{'), 'home.css must define .puja-dots');
  assert.ok(homeCss.includes('background:rgba(107,18,32,.25)'), 'dots must have visible high-contrast styling');
  assert.ok(homeCss.includes('.puja-dots .dot.active{background:var(--maroon,#6B1220)'), 'active dot must have maroon styling');
  assert.ok(homeJs.includes('function buildDots()'), 'home.js must dynamically build dots');
  assert.ok(homeJs.includes('function syncActiveDot()'), 'home.js must sync dots on scroll');
});

check('F05: Splash & Font Blank Flash Elimination', () => {
  const animJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/animations.js'), 'utf8');
  const globalCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/global.css'), 'utf8');

  // Verify reduced timeout in animations.js
  assert.ok(animJs.includes('setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 600);'), 'Splash timeout must be shortened to 600ms');
  assert.ok(!animJs.includes('2500'), '2500ms delay must be eliminated');
  assert.ok(!globalCss.includes('html.fonts-loading { opacity: 0; }'), 'fonts-loading must not block opacity');
});

check('F06: Async CMS DOM Double-Paint Prevention', () => {
  const cmsRenderer = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/cms-renderer.js'), 'utf8');

  assert.ok(!cmsRenderer.includes('window.dispatchEvent(new Event("languageChanged"))'), 'cms-renderer.js must NOT fire unconditional global languageChanged event');
  assert.ok(cmsRenderer.includes('if (faqChanged && typeof buildFaqList === "function"'), 'cms-renderer.js must surgically update faqList only when faqChanged');
  assert.ok(cmsRenderer.includes('if (testChanged && typeof buildTestimonialList === "function"'), 'cms-renderer.js must surgically update testimonials only when testChanged');
});

check('F07: Puja Category Tabs & Empty State', () => {
  const pujasJs = fs.readFileSync(path.join(FRONTEND_DIR, 'content/pujas.js'), 'utf8');
  const cardsJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/cards.js'), 'utf8');

  assert.ok(pujasJs.includes('"cat": "Graha Shanti"') || pujasJs.includes('cat: "Graha Shanti"'), 'pujas.js must define distinct authentic categories');
  assert.ok(pujasJs.includes('"cat": "Wealth"') || pujasJs.includes('cat: "Wealth"'), 'pujas.js must define Wealth category');
  assert.ok(cardsJs.includes('if (renderedCount === 0)'), 'cards.js must check for 0 rendered cards');
  assert.ok(cardsJs.includes('empty.className = "empty-state";'), 'cards.js must display .empty-state when category is empty');
});

check('F08: Image Asset Fallback Fix', () => {
  const bookingJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/booking.js'), 'utf8');

  assert.ok(!bookingJs.includes('pujas/default.jpg'), 'booking.js must not reference non-existent pujas/default.jpg');
  assert.ok(!bookingJs.includes('packages/default.jpg'), 'booking.js must not reference non-existent packages/default.jpg');
  assert.ok(bookingJs.includes('assets/images/logo.png'), 'booking.js must use valid assets/images/logo.png fallback');
  assert.ok(fs.existsSync(path.join(FRONTEND_DIR, 'assets/images/logo.png')), 'assets/images/logo.png must exist on disk');
});

check('F09: Footer Legal & Policy Links', () => {
  const navbarJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/navbar.js'), 'utf8');

  assert.ok(navbarJs.includes('href="privacy.html"'), 'privacy link must point to privacy.html');
  assert.ok(navbarJs.includes('href="terms.html"'), 'terms link must point to terms.html');
  assert.ok(navbarJs.includes('href="refund.html"'), 'refund link must point to refund.html');
  assert.ok(navbarJs.includes('href="about.html"'), 'about link must point to about.html');

  assert.ok(fs.existsSync(path.join(FRONTEND_DIR, 'privacy.html')), 'privacy.html must exist');
  assert.ok(fs.existsSync(path.join(FRONTEND_DIR, 'terms.html')), 'terms.html must exist');
  assert.ok(fs.existsSync(path.join(FRONTEND_DIR, 'refund.html')), 'refund.html must exist');
  assert.ok(fs.existsSync(path.join(FRONTEND_DIR, 'about.html')), 'about.html must exist');
});

check('F10: Puja Details Error Handling', () => {
  const detailsJs = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/js/pages/details.js'), 'utf8');

  assert.ok(detailsJs.includes("document.querySelector('main') || document.querySelector('.pd-content') || document.body"), 'details.js must safely query fallback containers');
  assert.ok(detailsJs.includes('Puja not found'), 'details.js must show user-friendly not found message');
  assert.ok(detailsJs.includes('} else {'), 'details.js must wrap valid flow in else block');
});

check('F11: Homepage HTML Markup Validation', () => {
  const homeHtml = fs.readFileSync(path.join(FRONTEND_DIR, 'home.html'), 'utf8');

  const openTags = (homeHtml.match(/<section\b[^>]*>/gi) || []).length;
  const closeTags = (homeHtml.match(/<\/section>/gi) || []).length;
  assert.strictEqual(openTags, 9, `Expected 9 opening <section> tags, found ${openTags}`);
  assert.strictEqual(closeTags, 9, `Expected 9 closing </section> tags, found ${closeTags}`);
});

check('F12: Clean URL Static Routing in server.js', () => {
  const serverJs = fs.readFileSync(path.join(BACKEND_DIR, 'server.js'), 'utf8');

  assert.ok(serverJs.includes('else if (!path.extname(filePath))'), 'server.js must detect extensionless paths');
  assert.ok(serverJs.includes('const htmlCandidate = filePath + ".html";'), 'server.js must append .html candidate');
  assert.ok(serverJs.includes('if (fs.existsSync(htmlCandidate))'), 'server.js must check existence of htmlCandidate');
});

check('F13: Mobile Account Navigation Reflow', () => {
  const respCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/responsive.css'), 'utf8');
  const accountCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/account.css'), 'utf8');

  assert.ok(respCss.includes('.account-grid > .side-card') || accountCss.includes('.account-grid > .side-card') || accountCss.includes('.account-grid>.side-card'), 'account navigation reflow must be defined');
  const combined = respCss + '\n' + accountCss;
  assert.ok(combined.includes('overflow-x: auto'), 'must enable horizontal scrolling for account chips');
  assert.ok(combined.includes('flex-direction: row') || combined.includes('flex-wrap: nowrap'), 'must reflow vertically stacked sidebar into horizontal row');
});

check('F14: Admin Panel Responsive Viewports', () => {
  const adminCss = fs.readFileSync(path.join(FRONTEND_DIR, 'assets/css/admin.css'), 'utf8');

  assert.ok(adminCss.includes('@media (max-width: 900px)'), 'admin.css must include 900px media query');
  assert.ok(adminCss.includes('@media (max-width: 768px)'), 'admin.css must include 768px media query');
  assert.ok(adminCss.includes('overflow-x: auto !important;'), 'admin.css must allow tables to scroll horizontally');
});

// ==========================================
// 2. Forensic Integrity & Security Checks
// ==========================================

check('SEC: Path Traversal Defense in server.js', () => {
  const serverJs = fs.readFileSync(path.join(BACKEND_DIR, 'server.js'), 'utf8');

  assert.ok(serverJs.includes('if (!filePath.startsWith(FRONTEND_DIR)) return send(res, 403, { error: "Forbidden" });'), 'Static file server must reject paths outside FRONTEND_DIR');
  assert.ok(serverJs.includes('if (!uploadPath.startsWith(path.join(__dirname, "uploads"))) return send(res, 403, { error: "Forbidden" });'), 'Upload streaming must reject paths outside uploads dir');
});

check('INTEG: No Hardcoded Test Bypass Logic', () => {
  const filesToScan = [
    'frontend/assets/js/booking.js',
    'frontend/assets/js/navbar.js',
    'frontend/assets/js/cards.js',
    'frontend/assets/js/cms-renderer.js',
    'frontend/assets/js/pages/payment.js',
    'frontend/assets/js/pages/details.js',
    'frontend/assets/js/pages/home.js',
    'backend/server.js'
  ];

  const suspiciousPatterns = [
    /\bif\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]test['"]\s*\)\s*return/i,
    /\bif\s*\(.*test_mode.*\)/i,
    /\bif\s*\(.*fake_test.*\)/i,
    /\b__TEST_MOCK__/i,
    /\bwindow\.__TEST_PASSED__/i
  ];

  for (const relPath of filesToScan) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of suspiciousPatterns) {
      assert.ok(!pattern.test(content), `Found suspicious pattern ${pattern} in ${relPath}`);
    }
  }
});

check('INTEG: No Facade Functions or Dummy Stubs', () => {
  const filesToScan = [
    'frontend/assets/js/booking.js',
    'frontend/assets/js/navbar.js',
    'frontend/assets/js/cards.js',
    'frontend/assets/js/cms-renderer.js',
    'frontend/assets/js/pages/payment.js',
    'frontend/assets/js/pages/details.js',
    'frontend/assets/js/pages/home.js'
  ];

  for (const relPath of filesToScan) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    // Ensure no empty functions that simply return true or constant
    const stubPattern = /function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{\s*return\s+(true|false|1|0|null|undefined|""|'');?\s*\}/g;
    const matches = content.match(stubPattern);
    assert.strictEqual(matches, null, `Found potential facade/stub in ${relPath}: ${matches ? matches.join('; ') : ''}`);
  }
});

// Output Summary
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`\n========================================`);
console.log(`FORENSIC AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
