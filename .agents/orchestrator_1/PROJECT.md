# Project: Shubha Sankalpam QA Audit, Hardening & Booking Validation

## Architecture
- **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript served statically by custom Node.js HTTP server. Key pages: `home.html`, `puja.html`, `puja-details.html`, `package.html`, `booking.html`, `payment.html`, `account.html`, `login.html`, and `about.html`/policies.
- **Backend & Admin**: Custom Node.js HTTP/Express-like router (`backend/server.js`, `backend/routes/api.js`), controllers (`authController`, `bookingController`, `paymentController`), models (`bookingModel`, `userModel`), utilities (`cmsSync`, `whatsapp`, `catalog`). Master admin dashboard at `/admin` (`backend/admin.html` + `frontend/assets/js/admin.js`).
- **Database & Services**: Supabase (PostgreSQL tables: `bookings`, `devotees`, `pujas`, `cms_pujas`, `puja_packages`), Razorpay payment gateway, AiSensy WhatsApp API, MSG91 SMS gateway.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Mobile Fixed Widget Coordination | Coordinate `.bottom-nav`, `.floating-wa`, `.abandoned-fab`, and `.pd-sticky-bottom` on mobile viewports so they do not collide or cover content | M1 | Survey 1 (FIX-01) |
| F02 | Mobile Sticky Pill Responsive Layout | Prevent overflow of `.pd-sticky-bottom` on 375px screens when regional text (Telugu/Hindi) is displayed | M1 | Survey 1 (FIX-02) |
| F03 | Mobile Hero Slider Height Stabilization | Lock `.hero-slider` height on mobile to prevent layout jumping/jerking on 6-second slide transitions | M1 | Survey 1 (FIX-03) |
| F04 | Carousel Dot Navigation Restoration | Add `#pujaDots` container in `home.html` and restore CSS visibility to synchronize carousel scroll dots | M1 | Survey 1 (FIX-04) |
| F05 | Splash & Font Blank Flash Elimination | Reduce/eliminate 2.3s white splash overlay and remove `html.fonts-loading` opacity blocking to prevent initial paint blank flash | M1 | Survey 1 (FIX-05) |
| F06 | Async CMS DOM Double-Paint Prevention | Optimize `cms-renderer.js` so async content merges do not unconditionally wipe and re-render the entire DOM | M1 | Survey 1 (FIX-06) |
| F07 | Puja Category Tabs & Empty State | Assign distinct categories (`Graha Shanti`, `Wealth`, `Protection`, `Special`, etc.) in `pujas.js` and add empty-state fallback in `cards.js` | M1 | Survey 1 (FIX-07) |
| F08 | Image Asset Fallback Fix | Replace broken `default.jpg` fallback references with existing valid images (`assets/images/logo.png`) | M1 | Survey 1 (FIX-08) |
| F09 | Footer Legal & Policy Links | Wire Privacy, Terms, and Refund links to their actual HTML pages; fix "About Us" redirect | M1 | Survey 1 (FIX-09) |
| F10 | Puja Details Error Handling | Fix unhandled `TypeError` in `details.js` when invalid puja reference is provided (replace missing `<main>` query) | M1 | Survey 1 (FIX-10) |
| F11 | Homepage HTML Markup Validation | Remove stray closing `</section>` in `home.html:252` | M1 | Survey 1 (FIX-11) |
| F12 | Clean URL Static Routing | Support extensionless URLs (`/booking`, `/account`, `/login`, etc.) in `backend/server.js` | M1 | Survey 1 (FIX-12) |
| F13 | Mobile Account Navigation Reflow | Transform 9-item vertical sidebar on mobile account page into horizontal scroll chips to save 520px vertical space | M1 | Survey 1 (FIX-15) |
| F14 | Admin Panel Responsive Viewports | Add media queries to `admin.css` to allow fluid mobile (375px) drawer toggle and tablet (768px) table scroll | M1 | Survey 1 (FIX-14) |
| F15 | Recovery Endpoint Crash Fix | Fix `TypeError: signToken is not a function` in `/api/bookings/recover` by importing `createSession` from `middleware/auth` | M2 | Survey 2 |
| F16 | Account Page Video Delivery Link | Include `video_url` in Supabase SELECT in `bookingModel.getUserBookings` and map to `videoUrl` so devotees can watch delivered puja videos | M2 | Survey 2 |
| F17 | Admin Package Image Preservation | Fix `admin.js:1051` saving `p.media` instead of `p.image` which previously wiped package images in Supabase sync | M2 | Survey 2 |
| F18 | Puja Gallery Persistence in Supabase | Include `gallery` array in `syncPujasToSupabase` and `syncFromSupabase` in `cmsSync.js` so gallery edits persist across restarts | M2 | Survey 2 |
| F19 | Admin View Unification & Session Persistence | Standardize on `backend/admin.html` at `/admin`, persist admin key in session storage so page reloads don't lose session, fix broken `/complete` endpoint | M2 | Survey 2 |
| F20 | Admin API Request Deduplication | Eliminate duplicate concurrent calls to `loadActiveUsersAnalytics()` on admin login and tab switch | M2 | Survey 2 |
| F21 | Undeclared Dependencies Declaration | Declare `busboy`, `image-size`, `file-type` in `backend/package.json` | M2 | Survey 2 |
| F22 | Admin Edit Booking Metadata Safeguard | Ensure editing bookings in Admin Panel never wipes out `BookingID:`, `razorpay_order:`, or `WhatsApp:` metadata | M2 | Survey 2 & 3 |
| F23 | Admin Booking Puja Name Display | Ensure Admin Panel displays actual puja name rather than "BookingID: XXXXXX" for manual bookings | M2 | Survey 3 |
| F24 | ₹11 Puja Multi-Language Availability | Align price of `Navanarasimha Homam` across English (currently 816) and Telugu (11) so ₹11 test puja is universally available | M3 | Survey 3 |
| F25 | First-Class 6-Digit Booking ID | Return generated 6-digit `shortId` in `POST /api/bookings` response; pass to UPI QR code note (`&tn=Booking 123456`), Razorpay receipt, and notes | M3 | Survey 3 (FIX-13) |
| F26 | Duplicate Pending Booking Prevention Fix | Fix `bookingController.js` duplicate query so it checks `devotee_phone`, price, and puja identifier rather than whole mutated notes | M3 | Survey 3 |
| F27 | Claim Payment Endpoint Fix | Update `POST /api/bookings/claim` to handle `{ id: bookingId }` from frontend as well as `razorpay_order_id` | M3 | Survey 3 |
| F28 | Manual Payment Pause (R4) | Implement payment link/QR generation and execution pause: output payment link/QR to Sentinel, pause until confirmed paid | M3 | Survey 3 (R4) |
| F29 | Webhook Idempotency & Unified Notification | Prevent duplicate AiSensy WhatsApp messages on webhook retry; ensure customer notification fires on successful payment | M3 | Survey 3 |
| F30 | Booking ID Consistency Verification (R5) | Formally verify that 6-digit Booking ID matches across Supabase, Admin Panel, Account page, Razorpay, and AiSensy | M3 | Survey 3 (R5) |
| F31 | Opaque-Box E2E Testing Suite (Tiers 1-4) | Autonomous test runner testing all inventoried features, boundaries, combinations, and workflows | E2E Track | ORIGINAL_REQUEST |
| F32 | Final Validation & QA Audit Report | Full ₹11 booking execution, verification of zero shifts/jerks/errors, and generation of `qa_audit_report.md` | Final Milestone | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven test harness and test suites (Tiers 1-4) | none | IN_PROGRESS |
| M1 | UI/UX & Responsive Hardening | F01 to F14 (Mobile overlaps, sticky pill, hero jerk, dots, splash, CMS render, categories, fallbacks, links, clean URLs, account/admin responsive) | none | DONE |
| M2 | Core Functional & Admin Stability | F15 to F23 (Recovery crash, video delivery, package image wipe, gallery sync, admin session persistence, API deduplication, metadata safeguard, dependencies) | none | IN_PROGRESS |
| M3 | ₹11 Booking, 6-Digit ID & Payment Pause | F24 to F30 (₹11 puja alignment, 6-digit ID consistency, duplicate booking fix, claim payment, manual payment pause hook, webhook idempotency) | M1, M2 | PLANNED |
| M4 | Final E2E Pass & QA Audit Report | F31, F32 (100% E2E test pass, adversarial Tier 5 hardening, ₹11 live booking execution, `qa_audit_report.md`) | M3, E2E | PLANNED |

## Interface Contracts
### Client ↔ Server Booking API (`/api/bookings`)
- `POST /api/bookings`:
  - Request: `{ ref, puja, price, name, gotram, phone, family, promoCode }`
  - Response (Status 201): `{ ok: true, id: "<uuid>", shortId: "<6-digit-string>" }`
  - Error (Status 400/409): `{ error: "<message>", price?: number }`

### Client ↔ Server Payment APIs (`/api/payments`)
- `POST /api/payments/order`:
  - Request: `{ bookingId }` (Bearer token auth)
  - Response (Status 200): `{ key: "<key>", order: { id, amount, currency, receipt }, booking: { id, shortId, price } }`
- `POST /api/payments/link` (New for Manual Payment Pause):
  - Request: `{ bookingId }` (Bearer token auth)
  - Response (Status 200): `{ ok: true, paymentLink: "<short_url>", qrString: "<upi_qr>", shortId: "<6-digit-string>" }`
- `POST /api/payments/verify`:
  - Request: `{ bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`
  - Response (Status 200): `{ ok: true, bookingId, shortId, status: "Paid" }`
- `POST /api/payments/webhook`:
  - Header: `x-razorpay-signature`
  - Payload: Razorpay webhook event (`payment.captured`, `payment.failed`)
  - Semantics: Idempotent. If booking already marked `Paid`, returns 200 `{ ok: true, duplicate: true }`.

### Booking ID Contract (R5)
- Every booking is associated with a 6-digit integer string `shortId` (regex: `/^\d{6}$/`).
- Database: Recorded in `notes` as `BookingID: <shortId>` (and in `short_id` column if present).
- Frontend: Loaded as `b.shortId` or extracted via `getShortId(b.notes, b.id)`. Never fallback to hex-slice UUID hashing.
- Payment: Passed as Razorpay `receipt: shortId`, Razorpay `notes.short_id: shortId`, and UPI transaction note `&tn=Booking <shortId>`.
- Notification: Passed to AiSensy WhatsApp template parameter #6 as `<shortId>`.

## Code Layout
- `frontend/`:
  - `home.html`, `puja.html`, `puja-details.html`, `package.html`, `booking.html`, `payment.html`, `account.html`, `login.html`, `about.html`, `privacy.html`, `terms.html`, `refund.html`
  - `assets/css/`: `global.css`, `navbar.css`, `hero.css`, `home.css`, `puja-details.css`, `puja-listing.css`, `forms.css`, `account.css`, `admin.css`, `animations.css`, `responsive.css`
  - `assets/js/`: `main.js`, `navbar.js`, `cards.js`, `animations.js`, `language.js`, `auth.js`, `booking.js`, `cms.js`, `cms-renderer.js`
  - `assets/js/pages/`: `home.js`, `details.js`, `payment.js`, `account.js`, `admin.js`
  - `content/`: `pujas.js`, `packages.js`, `site-settings.js`
- `backend/`:
  - `server.js`: Static file server, clean URL router, HTTP entry point
  - `admin.html`: Master admin dashboard template
  - `routes/api.js`: API router
  - `controllers/`: `authController.js`, `bookingController.js`, `paymentController.js`, `adminAuthController.js`
  - `models/`: `bookingModel.js`, `userModel.js`, `analyticsModel.js`
  - `middleware/`: `auth.js`
  - `utils/`: `cmsSync.js`, `whatsapp.js`, `catalog.js`, `idUtils.js`, `paymentTemplates.js`
- `tests/`: E2E test infrastructure and tier test suites
