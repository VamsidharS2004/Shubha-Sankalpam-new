# BRIEFING — 2026-09-23T13:32:00Z

## Mission
Conduct an authoritative code investigation of the Admin Panel and Core Backend functionality to identify bugs, stability risks, duplicate API calls, auth/session lifecycle issues, and propose concrete fix strategies.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, analysis, synthesis
- Working directory: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_2
- Original parent: 07afd6d6-948a-4a5c-b81b-8ba840b8dc0d
- Milestone: Survey 2 — Admin Panel and Backend Architecture Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Follow Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
- Proactively document exact file paths, line numbers, code snippets, and evidence chains

## Current Parent
- Conversation ID: 07afd6d6-948a-4a5c-b81b-8ba840b8dc0d
- Updated: 2026-09-23T13:32:00Z

## Investigation State
- **Explored paths**:
  - `backend/server.js`: Static routing, `/admin` entrypoint, HTTP server
  - `backend/admin.html` & `frontend/admin.html`: Dual admin views
  - `backend/routes/api.js`: All mounted REST API routes
  - `backend/middleware/auth.js`: Session creation, stateless token auth, `adminOnly`
  - `backend/controllers/adminAuthController.js`: Unmounted cookie session controller & rate limiter
  - `backend/controllers/authController.js`: OTP request & verify flow, delivery channels
  - `backend/controllers/bookingController.js`: Booking creation, claiming, video, recovery
  - `backend/controllers/paymentController.js`: Razorpay orders, webhooks, verification
  - `backend/controllers/cmsController.js`: Pujas, packages, temples, image uploads
  - `backend/controllers/websiteContentController.js`: Global translations CMS
  - `backend/controllers/userController.js`: Devotee CRUD and profile endpoints
  - `backend/controllers/videoController.js`: Local video upload and streaming
  - `backend/controllers/reminderController.js`: Abandoned booking WhatsApp recovery job
  - `backend/models/bookingModel.js`: Supabase & local storage, 6-digit ID generation, video URL
  - `backend/models/userModel.js`: Devotee profile management
  - `backend/models/analyticsModel.js`: Active user session tracking & persistence
  - `backend/utils/cmsSync.js`: Supabase CMS synchronization
  - `backend/utils/idUtils.js` & `paymentTemplates.js`: Short ID generation & WhatsApp templates
  - `frontend/assets/js/admin.js` & `frontend/assets/js/pages/admin.js`: Admin scripts
  - `frontend/assets/js/main.js`, `navbar.js`, `auth.js`, `cards.js`, `booking.js`, `cms-renderer.js`
- **Key findings**:
  - Critical Crash in `/api/bookings/recover` due to undefined `signToken` (line 179 of `bookingController.js`).
  - Broken Video Delivery on Supabase: `bookingModel.getUserBookings` excludes `video_url` from SELECT and hardcodes `videoUrl: null`, blocking devotees from watching delivered videos on their Account page.
  - Package Image Cleared on Save: `admin.js` assigns `p.media` instead of `p.image`, causing `syncPackagesToSupabase` to wipe `media` on Supabase.
  - Puja Gallery Not Persisted: `syncPujasToSupabase` omits `puja.gallery`, causing gallery images added in Admin to be lost upon server restart or Supabase sync.
  - UPI QR "I Have Paid" API Failure: `payment.js` sends `{ id: bookingId }` to `/api/bookings/claim`, but `bookingController.claimPayment` requires `razorpay_order_id`, always returning 400.
  - Missing WhatsApp notification in `verifyPayment`: Only webhook sends confirmation message; frontend verification omits AiSensy message.
  - Duplicate API Calls in Admin: `doLogin()` triggers `loadActiveUsersAnalytics()` twice simultaneously via `Promise.all` and `switchTab('view-dashboard')`.
  - Inconsistent Language Keys: 3 different localStorage keys used across frontend (`ss_lang`, `preferredLanguage`, `lang`).
  - Dual Admin Panel HTML/JS: `backend/admin.html` vs `frontend/admin.html` (which has dead UI and broken `markCompleted` calling non-existent endpoint).
  - Unmounted Admin Auth Controller: `adminAuthController.js` with secure cookies and rate limiting exists and has unit tests, but is not wired up in `routes/api.js`.
  - Missing npm dependencies in `backend/package.json`: `busboy`, `image-size`, `file-type`.
  - ₹11 Puja Price Discrepancy: `Navanarasimha Homam-en` is ₹816 in English, while `Navanarasimha Homam-te` is ₹11 in Telugu.
- **Unexplored areas**: None within the scope of Admin Panel and Core Backend functionality.

## Key Decisions Made
- Fully documented all observations, exact line numbers, code snippets, logic chains, and concrete fix strategies for the 5-component handoff report.

## Artifact Index
- `.agents/explorer_survey_2/DISPATCH.md` — Dispatch instruction
- `.agents/explorer_survey_2/BRIEFING.md` — Persistent working memory
- `.agents/explorer_survey_2/progress.md` — Progress tracking heartbeat
- `.agents/explorer_survey_2/handoff.md` — Final comprehensive 5-component report
