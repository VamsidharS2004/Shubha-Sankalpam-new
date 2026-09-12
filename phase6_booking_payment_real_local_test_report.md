# Phase 6 — Booking/Payment Real Local Test Report

**Test window:** 2026-09-07 17:36 – 18:30 IST (two Chrome AutoGLM browser runs, 87 + 25 actions, screenshots captured per step)
**Environment:** `http://localhost:3001` (Shubha Sankalpam, local dev server, PID 9848 started 10:33 IST)
**Role:** TESTER ONLY — observation-only; no code/CMS/db/booking/payment modifications performed.

---

## 1. Localhost URL

`http://localhost:3001` — verified alive (HTTP 200) before testing. *(Server is stopped as of 2026-09-08 13:10 IST — see the companion profile-fix report.)*

## 2. Pre-test state (as instructed)

- `bookings` table: 0 rows (authoritative service-role count)
- Razorpay: **LIVE keys** configured (`rzp_live_…`) → no payment testing possible/authorized
- No approved test-data cleanup mechanism → booking creation was NOT authorized by the test instructions

## 3. Tests performed and results

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | Site loads (desktop) | **PASS** | Title "Online Puja Booking — Book Vedic Pujas & Homams \| Shubha Sankalpam"; header, hero, sections render; no broken images detected in either run |
| 2 | Language switching (EN/HI/TE) | **PASS** | Navbar selector switches home + puja listing: hero, section headings, category tabs, card titles/buttons all translate; no layout breakage. Documented gap: footer and main nav stay English in all languages |
| 3 | Puja listing | **PASS** | 6 puja cards (Navanarasimha Homam ₹1816, Venkateswara Swamy Abhishekam ₹1816, Go-Grasam ₹151, Bhairava ₹11,500, Nagadevata ₹1816, Bhu Varaha ₹1816) |
| 4 | Puja details page | **PASS** | Title/date/time/duration/temple/highlights/about/benefits render; price shown. **All 6 pujas show "Booking Closed" + "Notify Me" — no "Book Now" button anywhere** (dates are in the past relative to Sep 7) |
| 5 | Login flow (OTP) | **PASS (mechanically)** / **FAIL (persistence)** | OTP request 200; OTP read from Gmail tab; verify OK; profile-completion step appeared; saving profile did NOT persist (account kept "Add your name") — **root cause = pre-fix `userModel.js` bug; fix applied 19:17 IST after these runs; re-verification pending (see companion report)** |
| 6 | Account → Bookings empty state | **PASS** | All three tabs (Ongoing/Pending/Completed) show correct, well-worded empty-state messages; TOTAL BOOKINGS: 0 |
| 7 | Booking form UI (fill without submit) | **NOT EXECUTED** | Unreachable — every puja shows "Booking Closed"; no Book Now path to the form |
| 8 | New booking + booking ID | **NOT EXECUTED** | Creation not authorized (persistent record, no cleanup mechanism); also unreachable via UI (see #7) |
| 9 | Duplicate booking (same details) | **NOT EXECUTED** | Requires #8 |
| 10 | Different-family-details case | **NOT EXECUTED** | Requires #8 |
| 11 | Same phone / different Puja case | **NOT EXECUTED** | Requires #8 |
| 12 | Continue Payment reuse of booking ID | **NOT EXECUTED** | No pending booking existed |
| 13 | Cancel/close payment → stays Pending | **NOT EXECUTED** | No booking |
| 14 | Payment retry reuse | **NOT EXECUTED** | No booking |
| 15 | Payment success (sandbox) | **NOT EXECUTED** | Razorpay keys are LIVE (`rzp_live_…`) — no safe sandbox exists; no payment attempted |
| 16 | Existing Pending/Confirmed bookings visible | **NOT EXECUTED** | Bookings table contains 0 rows |
| 17 | `payment.html` direct access (no params) | **PASS (guard works)** | Silently redirects to `puja.html` — no crash, no blank page, but **no explanatory message shown** (UX gap, documented, not fixed) |
| 18 | Admin booking display (read-only) | **PASS** | Admin loads (`changeme123`); Bookings tab: "0 bookings", "No bookings found.", filters render; Dashboard: Total Bookings 0, Revenue ₹0 |
| 19 | Admin devotee counter | **FAIL (cosmetic, documented)** | Dashboard said "Total Devotees: 1" while the Devotees tab pagination showed "0 of 0 devotees" with 1 row listed — inconsistent counter, left untouched |
| 20 | CMS regression (admin) | **PASS** | Website Content editor loads HOME with 62 translation fields (all "Translated" badges); page dropdown (GLOBAL/HOME/ABOUT/PRIVACY/TERMS/REFUND/BOOKING/LOGIN/ACCOUNT/PAYMENT) and EN/TE/HI language dropdown work read-only; Pujas (11 entries incl. multilingual), Packages (3), Temples (6) render; Site Settings shows "Settings coming soon." placeholder; FAQs/Testimonials/Page Sections/Blog/Reviews tabs do not exist in the current admin generation |
| 21 | Footer rendering | **PASS** | Footer renders fully (brand, Quick Links, Legal, contact, copyright) on home page in English and Telugu (first-run "footer missing" was a scroll/extraction artifact, corrected by the second run) |
| 22 | Console inspection | **NOT EXECUTED** | Browser-agent cannot open DevTools; no in-page error text observed anywhere during the runs |
| 23 | Network inspection | **PARTIAL (API-level)** | `GET /` 200 (14.8 KB); `GET /api/me` unauthenticated → 401 (auth guard works); `GET /api/content/global` 200 (52.6 KB); `POST /api/login/request` 200 `{"ok":true}`. `POST /api/bookings` intentionally never exercised. Note: `/api/pujas` & `/api/packages` return 404 by design (admin-only routes; public catalog is static `/content/*.js`) |
| 24 | Mobile layout | **NOT EXECUTED** | Browser-agent cannot resize/emulate viewports. Static evidence only: `viewport` meta present; `responsive.css` has 14 media queries (+ hero 4, home 1, vedamandir-mobile 2) |
| 25 | Existing data safety | **PASS** | No inserts/updates/deletes by tester; the tester's OTP-login attempt on the pre-fix server left **no** DB record (insert failed server-side; nothing persisted); `users.json` untouched (mtime 2026-08-30) |

## 4. Booking IDs used

None — no booking was created (by design).

## 5. Duplicate / family-variant test results

**NOT EXECUTED** (booking creation was not authorized and no booking existed).

## 6. Console / Network errors

- In-page: no visible error messages, raw JSON, or broken images in either browser run.
- DevTools console/network capture: not possible with the available browser agent (tool limitation).
- API-level: all probed endpoints returned expected statuses (see #23).

## 7. Database safety verification

Authoritative service-role reads (2026-09-08): `bookings = 0`, `devotees = 2` (owner's own account from Sep 6, plus one row created at 19:18:59 IST Sep 7 by another operator's post-fix test — see companion report). No database changes were made by this tester. *(Correction: an earlier "devotees = 0" reading was an artifact of a malformed Authorization header in the tester's probe script — see companion report §7.)*

## 8. File-change verification

`git status --porcelain` snapshotted before and after the browser runs — identical (74 lines of pre-existing modifications/untracked files from prior phases). All 11 entries added after the test window (userModel fix + backup, `patch_*.css`, other agents' reports) were created by other operators, not the tester. The tester's only repo additions are the two report files.

## 9. Summary of issues found (not fixed)

1. Profile save silently failed on the pre-fix server (now addressed by the 19:17 fix; browser re-verification pending).
2. All pujas show "Booking Closed" — the entire booking flow is unreachable with current data/dates (relevant because it blocks real booking testing).
3. Admin devotee counter inconsistency (dashboard total vs tab pagination).
4. `payment.html` direct access redirects silently with no message.
5. Footer and main nav do not translate in TE/HI.
6. Site Settings admin tab is a "coming soon" placeholder; several admin tabs (FAQs, Testimonials, Page Sections, Blog, Reviews) absent in the current admin generation.

## FINAL STATUS

**FINAL LOCAL TESTING INCOMPLETE — DO NOT DEPLOY**

*(Booking/payment/dedup/retry flow: NOT EXECUTED; profile persistence fix: verified at DB level by another operator's run, browser re-verification pending; Razorpay is on LIVE keys — do not enable payments in production until sandbox verification.)*
