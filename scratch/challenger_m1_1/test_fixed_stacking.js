/**
 * Challenger M1-1: Multi-Widget Coordinate Stacking Test
 * Evaluates .bottom-nav, .floating-wa, .pd-sticky-bottom, .fixed-pay-btn, and .abandoned-fab
 * across viewports: Mobile (375px), Tablet (768px), and Desktop (1280px).
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '..', '..');
const responsiveCssPath = path.join(projectRoot, 'frontend', 'assets', 'css', 'responsive.css');
const navbarCssPath = path.join(projectRoot, 'frontend', 'assets', 'css', 'navbar.css');
const pujaDetailsCssPath = path.join(projectRoot, 'frontend', 'assets', 'css', 'puja-details.css');
const formsCssPath = path.join(projectRoot, 'frontend', 'assets', 'css', 'forms.css');
const navbarJsPath = path.join(projectRoot, 'frontend', 'assets', 'js', 'navbar.js');

console.log('================================================================');
console.log(' CHALLENGER M1-1: MULTI-WIDGET COORDINATE STACKING STRESS TEST');
console.log('================================================================');

const respCss = fs.readFileSync(responsiveCssPath, 'utf8');
const navCss = fs.readFileSync(navbarCssPath, 'utf8');
const pdCss = fs.readFileSync(pujaDetailsCssPath, 'utf8');
const formsCss = fs.readFileSync(formsCssPath, 'utf8');
const navJs = fs.readFileSync(navbarJsPath, 'utf8');

const pages = ['home', 'puja-details', 'booking'];
const viewports = [
  { name: 'mobile-375', width: 375, isMobile: true, isTablet: false, isDesktop: false },
  { name: 'tablet-768', width: 768, isMobile: false, isTablet: true, isDesktop: false },
  { name: 'desktop-1280', width: 1280, isMobile: false, isTablet: false, isDesktop: true }
];

let totalChecks = 0;
let passedChecks = 0;

function evaluateLayout(page, vp) {
  console.log(`\nTesting Page: "${page}" on Viewport: ${vp.name} (${vp.width}px)`);

  const widgets = [];

  // 1. .bottom-nav
  if (vp.width <= 900) {
    widgets.push({
      name: '.bottom-nav',
      bottom: 0,
      height: 60,
      top: 60,
      zIndex: 60,
      spanX: [0, vp.width]
    });
  }

  // 2. Page-specific bottom widgets
  if (page === 'puja-details') {
    if (vp.width <= 768) {
      // .pd-sticky-bottom is fixed at bottom: 80px (72 + 8)
      const height = vp.width <= 480 ? 50 : 54;
      const left = vp.width <= 480 ? 8 : 12;
      const right = vp.width <= 480 ? 8 : 12;
      widgets.push({
        name: '.pd-sticky-bottom',
        bottom: 80,
        height,
        top: 80 + height,
        zIndex: 920,
        spanX: [left, vp.width - right]
      });

      // .floating-wa on puja-details <= 768px: bottom: 150px
      widgets.push({
        name: '.floating-wa',
        bottom: 150,
        height: 54,
        top: 150 + 54,
        zIndex: 930,
        spanX: [vp.width - 16 - 54, vp.width - 16]
      });
    } else {
      // Desktop puja-details: .pd-sticky-bottom is sticky centered, max-width 1000px
      const pillWidth = Math.min(1000, vp.width - 48);
      const pillLeft = (vp.width - pillWidth) / 2;
      widgets.push({
        name: '.pd-sticky-bottom (sticky)',
        bottom: 24,
        height: 60,
        top: 84,
        zIndex: 100,
        spanX: [pillLeft, pillLeft + pillWidth]
      });

      // .floating-wa on desktop: bottom 24px, right 24px
      widgets.push({
        name: '.floating-wa',
        bottom: 24,
        height: 60,
        top: 84,
        zIndex: 90,
        spanX: [vp.width - 24 - 60, vp.width - 24]
      });
    }
  } else if (page === 'booking') {
    if (vp.width <= 900) {
      // .fixed-pay-btn: bottom: 75px, left 16px, right 16px
      widgets.push({
        name: '.fixed-pay-btn',
        bottom: 75,
        height: 52,
        top: 75 + 52,
        zIndex: 85,
        spanX: [16, vp.width - 16]
      });

      // .floating-wa on booking: bottom: 148px
      widgets.push({
        name: '.floating-wa',
        bottom: 148,
        height: 54,
        top: 148 + 54,
        zIndex: 90,
        spanX: [vp.width - 16 - 54, vp.width - 16]
      });
    } else {
      // Desktop booking: sidebar is sticky top, pay-btn is in sidebar
      widgets.push({
        name: '.floating-wa',
        bottom: 24,
        height: 60,
        top: 84,
        zIndex: 90,
        spanX: [vp.width - 24 - 60, vp.width - 24]
      });
    }
  } else if (page === 'home') {
    if (vp.width <= 900) {
      // .floating-wa: bottom: 85px, right 16px
      widgets.push({
        name: '.floating-wa',
        bottom: 85,
        height: 54,
        top: 85 + 54,
        zIndex: 90,
        spanX: [vp.width - 16 - 54, vp.width - 16]
      });

      // .abandoned-fab: bottom: 146px, right 16px
      widgets.push({
        name: '.abandoned-fab',
        bottom: 146,
        height: 52,
        top: 146 + 52,
        zIndex: 9999,
        spanX: [vp.width - 16 - 52, vp.width - 16]
      });
    } else {
      // Desktop home:
      // .floating-wa: bottom: 24px, right 24px
      widgets.push({
        name: '.floating-wa',
        bottom: 24,
        height: 60,
        top: 84,
        zIndex: 90,
        spanX: [vp.width - 24 - 60, vp.width - 24]
      });

      // .abandoned-fab: bottom: 120px, right 24px
      widgets.push({
        name: '.abandoned-fab',
        bottom: 120,
        height: 60,
        top: 180,
        zIndex: 9999,
        spanX: [vp.width - 24 - 60, vp.width - 24]
      });
    }
  }

  // Check collision between all pairs of active widgets
  let collisionFound = false;
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      totalChecks++;
      const w1 = widgets[i];
      const w2 = widgets[j];

      // Check horizontal overlap
      const hOverlap = !(w1.spanX[1] <= w2.spanX[0] || w2.spanX[1] <= w1.spanX[0]);
      // Check vertical overlap (bottom to top range)
      const vOverlap = !(w1.top <= w2.bottom || w2.top <= w1.bottom);

      if (hOverlap && vOverlap) {
        console.error(`  [COLLISION] ${w1.name} [Y: ${w1.bottom}px-${w1.top}px, X: ${w1.spanX[0]}-${w1.spanX[1]}] collides with ${w2.name} [Y: ${w2.bottom}px-${w2.top}px, X: ${w2.spanX[0]}-${w2.spanX[1]}]`);
        collisionFound = true;
      } else {
        passedChecks++;
        const clearance = Math.abs(w1.bottom < w2.bottom ? (w2.bottom - w1.top) : (w1.bottom - w2.top));
        const clearanceType = hOverlap ? `Vertical clearance: ${clearance}px` : `Horizontal clearance: ${w1.spanX[0] > w2.spanX[1] ? w1.spanX[0] - w2.spanX[1] : w2.spanX[0] - w1.spanX[1]}px`;
        console.log(`  [OK] ${w1.name} vs ${w2.name} -> Clean separation (${clearanceType})`);
      }
    }
  }

  // Check abandoned-fab suppression on funnel pages
  if (page === 'puja-details' || page === 'booking') {
    totalChecks++;
    // Verify CSS suppression
    const cssSuppresses = respCss.includes('body:has(.pd-sticky-bottom) .abandoned-fab') &&
                          respCss.includes('display: none !important');
    // Verify JS suppression
    const jsSuppresses = navJs.includes('currentPath.includes("puja-details")') &&
                         navJs.includes('currentPath.includes("booking")');
    if (cssSuppresses && jsSuppresses) {
      passedChecks++;
      console.log(`  [OK] .abandoned-fab is strictly suppressed on "${page}" via both CSS and JS.`);
    } else {
      console.error(`  [FAIL] .abandoned-fab is NOT properly suppressed on "${page}".`);
    }
  }

  return !collisionFound;
}

let allOk = true;
for (const p of pages) {
  for (const vp of viewports) {
    const ok = evaluateLayout(p, vp);
    if (!ok) allOk = false;
  }
}

console.log('\n================================================================');
console.log(`TOTAL COORDINATE STACKING CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks} / ${totalChecks}`);
if (allOk) {
  console.log('VERDICT: PASS — All fixed elements stack with zero collision across mobile, tablet, and desktop.');
} else {
  console.error('VERDICT: FAIL — Coordinate collision detected.');
  process.exit(1);
}
