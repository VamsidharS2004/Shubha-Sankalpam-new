## 2026-09-23T13:32:46Z

You are Worker M1 (UI/UX and Responsive Implementation Specialist).
Your working directory is: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m1
Read the original request file FIRST: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md
Read the project specification: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_1\PROJECT.md
Read Explorer 1 findings: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You exclusively own and may edit:
- `frontend/assets/css/puja-details.css`
- `frontend/assets/css/responsive.css`
- `frontend/assets/css/hero.css`
- `frontend/assets/css/home.css`
- `frontend/assets/css/forms.css`
- `frontend/assets/css/animations.css`
- `frontend/assets/css/account.css`
- `frontend/assets/css/admin.css`
- `frontend/home.html`
- `frontend/puja-details.html`
- `frontend/account.html`
- `frontend/content/pujas.js`
- `frontend/assets/js/navbar.js`
- `frontend/assets/js/cards.js`
- `frontend/assets/js/booking.js`
- `frontend/assets/js/cms-renderer.js`
- `frontend/assets/js/pages/home.js`
- `frontend/assets/js/pages/details.js`
- `backend/server.js` (clean URL routing only)

Tasks to Implement:
Implement FIX-01 through FIX-16 from Explorer 1 report:
1. Coordinate fixed mobile widgets (`.bottom-nav`, `.floating-wa`, `.abandoned-fab`, `.pd-sticky-bottom`, `.fixed-pay-btn`) to prevent overlaps and coordinate z-indexes/bottom offsets.
2. Fix `.pd-sticky-bottom` overflow on 375px screens with Telugu button text ("ఇప్పుడే బుక్ చేసుకోండి").
3. Lock mobile hero slider height (`.hero-slider`) to stop dynamic height snapping and vertical jerking on slide changes.
4. Restore `#pujaDots` container in `home.html` and enable dot indicators in `home.css`.
5. Eliminate 2.3s white splash overlay delay (shorten to smooth <0.6s) and remove `html.fonts-loading` opacity blocking to eliminate blank flashes.
6. Fix async CMS render flicker in `cms-renderer.js` so it doesn't unconditionally wipe grid DOM on load.
7. Assign real categories in `content/pujas.js` ("Graha Shanti", "Wealth", "Protection", "Special") and add empty-state handling in `cards.js`.
8. Fix broken fallback image references (`default.jpg` -> `assets/images/logo.png`).
9. Wire dead footer links (Privacy Policy, Terms of Service, Refund Policy) to their HTML files, and fix About Us link.
10. Fix unhandled TypeError on invalid puja ID in `details.js`.
11. Remove stray `</section>` in `home.html:252`.
12. Support clean URLs in `backend/server.js` (e.g. `/booking`, `/account`, `/login` serve `.html` file).
13. Reflow mobile Account page sidebar into horizontal scrollable chips to save 520px of vertical space.
14. Add `@media` queries in `admin.css` for mobile/tablet responsive layout.
15. Remove duplicate `buildWhyUsList` call in `home.js`.

User Global Rules:
- Windows PowerShell encoding risk: Use `replace_file_content` or utf8 scripts.
- Always run `node -c <file>` on any modified JS file before reporting done.
- Verify changes by running server tests.

Log progress in `progress.md`. When complete, write `handoff.md` and notify parent using send_message.
