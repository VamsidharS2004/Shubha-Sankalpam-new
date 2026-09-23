# Progress — Explorer Survey 2 (Admin Panel & Backend Explorer)

Last visited: 2026-09-23T13:30:30Z

## Status
- [x] Initialized DISPATCH.md and BRIEFING.md
- [x] Explored Backend Architecture & Configuration Entrypoints
- [x] Analyzed Dual Admin Panel Architecture (backend/admin.html vs frontend/admin.html, frontend/assets/js/admin.js vs frontend/assets/js/pages/admin.js)
- [x] Audited Admin Authentication & Authorization (in-memory KEY vs adminKey localStorage vs unmounted adminAuthController.js with HttpOnly cookie)
- [x] Audited Admin Capabilities:
  - Pujas: dynamic rows, gallery image uploads, price inconsistencies between EN (₹816) and TE (₹11)
  - Packages: saving image to `p.media` instead of `p.image`, causing images to be cleared on Supabase sync
  - Galleries: `puja.gallery` not persisted in Supabase `syncPujasToSupabase`, wiped on server restart
  - Bookings: manual create, update, delete, video attachment
  - Devotees: list, add, edit, delete, lead tracking
  - Website Content / CMS: `GET /api/content/global`, `PUT /api/admin/content/global`, language dictionaries
  - Live Updates: Active users tracking, 30s polling loop, duplicate initial fetches
- [x] Audited User Session Lifecycle:
  - Login/OTP generation (Msg91 vs AiSensy/Meta WhatsApp vs Demo Mode)
  - OTP verification (4 digits, 5 min TTL, 3 attempt max)
  - Stateless token generation (HMAC-SHA256, no expiry/invalidation)
  - Client token storage (`localStorage.token`)
  - Session persistence and auto-login
- [x] Audited API Structure & Duplicate Request Sources:
  - `doLogin()` duplicate `loadActiveUsersAnalytics()` invocation
  - Uncoordinated 30s polling
  - UPI QR code `POST /api/bookings/claim` parameter mismatch (`{ id }` vs `{ razorpay_order_id }`)
  - Missing WhatsApp notification call in `verifyPayment`
  - Critical crash in `/api/bookings/recover` (`signToken is not a function`)
  - Undeclared npm dependencies (`busboy`, `image-size`, `file-type`)
  - Account page missing `video_url` in Supabase query
  - 3 conflicting localStorage keys for language (`ss_lang`, `preferredLanguage`, `lang`)
- [ ] Synthesize Findings & Propose Concrete Fix Strategies
- [ ] Generate Comprehensive handoff.md and notify Orchestrator
