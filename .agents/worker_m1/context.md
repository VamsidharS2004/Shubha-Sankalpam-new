# Worker M1 Context — UI/UX & Responsive Hardening

Working Directory: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m1
Original Request: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md
Project Scope: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_1\PROJECT.md
Explorer Survey Report: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_1\handoff.md

## Scope & File Ownership
You exclusively own and will modify:
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

## Assigned Issues & Fixes
Implement FIX-01 through FIX-16 from Explorer 1 handoff report:
1. Fix mobile fixed widget collision (.bottom-nav, .floating-wa, .abandoned-fab, .pd-sticky-bottom, .fixed-pay-btn) so elements do not overlap or block clicks.
2. Fix sticky bottom pill overflow on 375px screens when displaying Telugu text ("ఇప్పుడే బుక్ చేసుకోండి").
3. Fix mobile hero slider dynamic height snapping (lock height to prevent layout jerking on slide transitions).
4. Add `#pujaDots` container in `home.html` and restore carousel dot synchronization.
5. Eliminate 2.3s white splash overlay delay and remove `fonts-loading` opacity blocking to eliminate blank flashes.
6. Fix async CMS DOM wipe so language and content updates do not flash or double-render grids.
7. Assign valid categories in `content/pujas.js` (Graha Shanti, Wealth, Protection, Special, etc.) and add an empty-state message if no pujas match.
8. Fix broken fallback image references (`default.jpg` -> `assets/images/logo.png`).
9. Fix dead footer links (Privacy Policy, Terms of Service, Refund Policy -> actual html files) and fix About Us link (`about.html`).
10. Fix unhandled TypeError in `details.js` on invalid puja ID.
11. Remove stray closing `</section>` in `home.html:252`.
12. Add clean URL support in `backend/server.js` (extensionless requests `/booking`, `/account`, etc. serve their `.html` file).
13. Reflow mobile Account page sidebar menu into horizontal scroll chips to save 520px of vertical space.
14. Add responsive `@media` rules to `admin.css` to enable mobile drawer toggle and tablet horizontal scroll.
15. Remove redundant duplicate call to `buildWhyUsList` in `home.js`.

Always check JavaScript syntax using `node -c <file>` after modifying any JS file.
Run tests and verify layout on mobile (375px), tablet (768px), and desktop (1280px).
