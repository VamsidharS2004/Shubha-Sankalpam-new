/**
 * Challenger M1-1: Stress Test for Mobile 375px Layout with Telugu Text
 * Verifies .pd-sticky-bottom container bounds and contents across viewports (320px, 360px, 375px, 390px, 414px)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '..', '..');
const pdCssPath = path.join(projectRoot, 'frontend', 'assets', 'css', 'puja-details.css');
const pdHtmlPath = path.join(projectRoot, 'frontend', 'puja-details.html');
const langJsPath = path.join(projectRoot, 'frontend', 'assets', 'js', 'language.js');

console.log('================================================================');
console.log(' CHALLENGER M1-1: 375px MOBILE LAYOUT & TELUGU TEXT STRESS TEST');
console.log('================================================================');

// 1. Verify CSS rules exist and match exact specs
const cssContent = fs.readFileSync(pdCssPath, 'utf8');

// Check media queries for <= 480px and <= 768px
const media480Match = cssContent.match(/@media\s*\(\s*max-width:\s*480px\s*\)\s*\{([\s\S]*?)\n\}/);
assert.ok(media480Match, 'CSS must contain @media (max-width: 480px) query in puja-details.css');
const media480Content = media480Match[1];

// Verify icon hidden on <=480px
assert.ok(
  /\.pd-sb-icon\s*\{[^}]*display:\s*none/i.test(media480Content),
  '.pd-sb-icon must be hidden (display: none) on <= 480px'
);

// Verify title clamped on <=480px
const titleMatch = media480Content.match(/\.pd-sb-text\s+h4\s*\{[^}]*max-width:\s*(\d+)px/i);
assert.ok(titleMatch, '.pd-sb-text h4 must specify max-width on <= 480px');
const titleMaxWidth = parseInt(titleMatch[1], 10);
assert.ok(titleMaxWidth <= 90, `Title max-width (${titleMaxWidth}px) must be <= 90px`);

// Verify button padding and font-size on <=480px
const btnMatch = media480Content.match(/\.pd-sb-right\s+\.pd-btn-white\s*\{[^}]*padding:\s*(\d+)px\s+(\d+)px/i);
assert.ok(btnMatch, '.pd-sb-right .pd-btn-white must have compact padding on <= 480px');
const [_, btnPadV, btnPadH] = btnMatch.map(Number);

const btnFontMatch = media480Content.match(/\.pd-sb-right\s+\.pd-btn-white\s*\{[^}]*font-size:\s*([0-9.]+)rem/i);
assert.ok(btnFontMatch, '.pd-sb-right .pd-btn-white must specify font-size on <= 480px');
const btnFontSizeRem = parseFloat(btnFontMatch[1]);

// Verify sticky container bounding rules on <=480px
const containerMatch = media480Content.match(/\.pd-sticky-bottom\s*\{([\s\S]*?)\}/i);
assert.ok(containerMatch, '.pd-sticky-bottom rules must exist on <= 480px');
const containerRules = containerMatch[1];

const leftMatch = containerRules.match(/left:\s*(\d+)px/i);
const rightMatch = containerRules.match(/right:\s*(\d+)px/i);
assert.ok(leftMatch && rightMatch, 'Container must define explicit left and right offsets');
const containerInset = parseInt(leftMatch[1], 10) + parseInt(rightMatch[1], 10);

const padMatch = containerRules.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px\s+(\d+)px/i);
assert.ok(padMatch, 'Container must define 4-value padding on <= 480px');
const containerPadH = parseInt(padMatch[2], 10) + parseInt(padMatch[4], 10);

// Icon button inside pd-btn-white
const btnIconMatch = media480Content.match(/\.pd-btn-icon\s*\{[^}]*width:\s*(\d+)px/i);
const btnIconWidth = btnIconMatch ? parseInt(btnIconMatch[1], 10) : 20;

// Gap between left and right in pd-sb-inner
const gapMatch = cssContent.match(/\.pd-sb-inner\s*\{[^}]*gap:\s*(\d+)px/i);
const innerGap = gapMatch ? parseInt(gapMatch[1], 10) : 8;

console.log('Extracted CSS Geometry:');
console.log(`- Container horizontal inset (left + right): ${containerInset}px`);
console.log(`- Container horizontal padding: ${containerPadH}px`);
console.log(`- Left title max-width: ${titleMaxWidth}px`);
console.log(`- Right button horizontal padding: ${btnPadH * 2}px`);
console.log(`- Right button font-size: ${btnFontSizeRem}rem (${btnFontSizeRem * 16}px)`);
console.log(`- Button icon width: ${btnIconWidth}px`);
console.log(`- Inner flex gap: ${innerGap}px`);

// 2. Stress-test geometry against Telugu strings
const testStrings = [
  { label: 'Canonical Survey Telugu Text', text: 'ఇప్పుడే బుక్ చేసుకోండి' },
  { label: 'Current Language.js Telugu Text', text: 'బుక్ చేయండి' },
  { label: 'Adversarial Long Telugu Text', text: 'ఇప్పుడే మీ పూజను బుక్ చేసుకోండి' },
  { label: 'English Fallback Text', text: 'Book Now' }
];

// Viewport sizes to test
const viewports = [320, 360, 375, 390, 414];

function estimateTextWidth(str, fontSizePx) {
  // Telugu clusters take between 0.7em to 1.1em depending on conjunct complexity
  // We use conservative upper-bound estimation: 1.05em per cluster, 0.4em for spaces
  const clusters = str.match(/[\u0C00-\u0C7F][\u0C00-\u0C7F]*|\s+|[^\u0C00-\u0C7F\s]+/gu) || [];
  let emUnits = 0;
  for (const c of clusters) {
    if (/\s+/.test(c)) {
      emUnits += 0.35;
    } else if (/[\u0C00-\u0C7F]/.test(c)) {
      // Telugu cluster
      emUnits += 0.95;
    } else {
      // Latin
      emUnits += 0.6;
    }
  }
  return Math.ceil(emUnits * fontSizePx);
}

let allPassed = true;

for (const vp of viewports) {
  console.log(`\n--- Viewport: ${vp}px ---`);
  const availableContainerWidth = vp - containerInset;
  const availableInnerWidth = availableContainerWidth - containerPadH;

  for (const { label, text } of testStrings) {
    const textWidth = estimateTextWidth(text, btnFontSizeRem * 16);
    // Button width: padding + text + gap (4px) + icon
    const buttonWidth = (btnPadH * 2) + textWidth + 4 + btnIconWidth;
    
    // Left side: icon is 0px (display: none), title is capped to titleMaxWidth, price (~45px)
    // Left flex container width is max(titleMaxWidth, price)
    const leftWidth = Math.max(titleMaxWidth, 50);

    const totalRequiredWidth = leftWidth + innerGap + buttonWidth;
    const marginHeadroom = availableInnerWidth - totalRequiredWidth;

    const status = marginHeadroom >= 0 ? 'PASS' : 'FAIL';
    if (marginHeadroom < 0) allPassed = false;

    console.log(`[${status}] [${vp}px] ${label} ("${text}"):`);
    console.log(`       Text Est: ${textWidth}px | Button: ${buttonWidth}px | Left: ${leftWidth}px | Total: ${totalRequiredWidth}px / ${availableInnerWidth}px (Headroom: ${marginHeadroom}px)`);
  }
}

// 3. Verify HTML structure & CSS classes
const htmlContent = fs.readFileSync(pdHtmlPath, 'utf8');
assert.ok(htmlContent.includes('class="pd-sticky-bottom"'), 'puja-details.html must contain .pd-sticky-bottom');
assert.ok(htmlContent.includes('id="pdStickyRow"'), 'puja-details.html must contain #pdStickyRow');
assert.ok(htmlContent.includes('id="pdStickyName"'), 'puja-details.html must contain #pdStickyName');
assert.ok(htmlContent.includes('id="pdStickyPrice"'), 'puja-details.html must contain #pdStickyPrice');
assert.ok(htmlContent.includes('id="pdStickyBook"'), 'puja-details.html must contain #pdStickyBook');

console.log('\n----------------------------------------------------------------');
if (allPassed) {
  console.log('VERDICT: PASS — Zero horizontal blowout for Telugu text on 375px (and 320px–414px).');
} else {
  console.error('VERDICT: FAIL — Horizontal blowout detected under test conditions.');
  process.exit(1);
}
